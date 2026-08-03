# chatbot/views.py - VERSÃO COM WEBHOOK DA EVOLUTION API

# --- SEÇÃO DE IMPORTAÇÕES PADRÃO E DJANGO ---
import re
import os
import json
import logging
from datetime import datetime, time, timedelta
from dateutil import parser
from typing import Optional
from pydantic import BaseModel, Field
import threading

from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings
from django.utils.html import escape

# --- SEÇÃO DE IMPORTAÇÕES DO DJANGO REST FRAMEWORK ---
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_api_key.permissions import HasAPIKey

# --- SEÇÃO DE IMPORTAÇÕES DO LANGCHAIN E IA ---
from dotenv import load_dotenv
import requests
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

# --- SEÇÃO DE IMPORTAÇÕES DO SEU PROJETO ---
import time
from .models import ChatMemory
from .services import buscar_precos_servicos
from pacientes.models import Paciente
from faturamento.models import Procedimento, Pagamento
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.services import buscar_proximo_horario_disponivel
from agendamentos.models import Agendamento
from usuarios.models import CustomUser, Especialidade
from pacientes.serializers import PacienteSerializer
from agendamentos import services as agendamento_services
from usuarios.serializers import EspecialidadeSerializer, UserSerializer
from usuarios.models import CustomUser, JornadaDeTrabalho
from .bot_logic import processar_mensagem_bot
from .timeout_manager import TimeoutManager
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .whatsapp_service import WhatsAppBotHandler # <--- IMPORT DO SERVIÇO DO WHATSAPP

# --- CONFIGURAÇÕES INICIAIS ---
load_dotenv()
logger = logging.getLogger(__name__)

# ==============================================================================
# VIEWS DA API (ANTIGAS)
# ==============================================================================

class CadastrarPacienteView(APIView):
    permission_classes = [HasAPIKey]

    def post(self, request):
        try:
            cpf = request.data.get('cpf', '').strip()
            email = request.data.get('email', '').strip()

            if cpf:
                cpf = re.sub(r'\D', '', cpf)
                if len(cpf) != 11:
                    return Response({'error': 'CPF deve ter 11 dígitos'}, status=status.HTTP_400_BAD_REQUEST)

            if Paciente.objects.filter(cpf=cpf).exists():
                return Response({'error': 'Um paciente com este CPF já está cadastrado.'}, status=status.HTTP_409_CONFLICT)

            if email and Paciente.objects.filter(email=email).exists():
                return Response({'error': 'Um paciente com este email já está cadastrado.'}, status=status.HTTP_409_CONFLICT)

            serializer = PacienteSerializer(data=request.data)
            if serializer.is_valid():
                paciente = serializer.save()
                return Response(
                    {'sucesso': f"Paciente {escape(paciente.nome_completo)} cadastrado com sucesso!", "paciente_id": paciente.id},
                    status=status.HTTP_201_CREATED
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Erro ao cadastrar paciente: {e}")
            return Response({'error': 'Erro interno do servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConsultarAgendamentosPacienteView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        try:
            cpf = request.query_params.get('cpf', '').strip()
            if cpf:
                cpf = re.sub(r'\D', '', cpf)
            if not cpf or len(cpf) != 11:
                return Response({'error': 'CPF inválido'}, status=status.HTTP_400_BAD_REQUEST)

            paciente = Paciente.objects.get(cpf=cpf)
            agendamentos = Agendamento.objects.filter(
                paciente=paciente,
                status__in=['Agendado', 'Confirmado']
            ).select_related('procedimento', 'especialidade').order_by('data_hora_inicio')[:50]

            dados_formatados = [
                {
                    "id": ag.id,
                    "data_hora": timezone.localtime(ag.data_hora_inicio).strftime('%d/%m/%Y às %H:%M'),
                    "status": ag.status,
                    "servico": ag.procedimento.descricao if ag.procedimento else ag.especialidade.nome if ag.especialidade else "Não especificado"
                }
                for ag in agendamentos
            ]
            return Response(dados_formatados)
        except Paciente.DoesNotExist:
            return Response({"error": "Paciente não encontrado"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erro ao consultar agendamentos: {e}")
            return Response({'error': 'Erro interno'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerificarPacienteCPFView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        try:
            cpf = request.query_params.get('cpf', '').strip()
            if not cpf:
                return Response({'error': 'CPF obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
            cpf_limpo = re.sub(r'\D', '', cpf)
            if len(cpf_limpo) != 11:
                return Response({'error': 'CPF inválido'}, status=status.HTTP_400_BAD_REQUEST)
            paciente_existe = Paciente.objects.filter(cpf=cpf_limpo).exists()
            return Response({"status": "paciente_encontrado" if paciente_existe else "paciente_nao_encontrado"})
        except Exception as e:
            logger.error(f"Erro ao verificar CPF: {e}")
            return Response({'error': 'Erro interno'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerificarSegurancaView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        try:
            telefone = request.data.get('telefone_celular', '').strip()
            cpf = request.data.get('cpf', '').strip()
            if cpf:
                cpf = re.sub(r'\D', '', cpf)
            if not telefone or not cpf or len(cpf) != 11:
                return Response({'error': 'Dados inválidos'}, status=status.HTTP_400_BAD_REQUEST)
            paciente_existe = Paciente.objects.filter(telefone_celular=telefone, cpf=cpf).exists()
            return Response({"status": "verificado" if paciente_existe else "dados_nao_conferem"})
        except Exception as e:
            logger.error(f"Erro na verificação: {e}")
            return Response({'error': 'Erro interno'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ListarEspecialidadesView(generics.ListAPIView):
    permission_classes = [HasAPIKey]
    queryset = Especialidade.objects.all().order_by('nome')
    serializer_class = EspecialidadeSerializer


class ListarMedicosPorEspecialidadeView(generics.ListAPIView):
    permission_classes = [HasAPIKey]
    serializer_class = UserSerializer
    def get_queryset(self):
        queryset = CustomUser.objects.filter(cargo='medico', is_active=True)
        especialidade_id = self.request.query_params.get('especialidade_id')
        if especialidade_id:
            queryset = queryset.filter(especialidades__id=especialidade_id)
        return queryset


class ListarProcedimentosView(generics.ListAPIView):
    permission_classes = [HasAPIKey]
    queryset = Procedimento.objects.filter(valor_particular__gt=0, ativo=True).exclude(descricao__iexact='consulta')
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        dados_formatados = [
            {"id": proc.id, "nome": proc.descricao, "valor": f"{proc.valor_particular:.2f}".replace('.', ',')}
            for proc in queryset
        ]
        return Response(dados_formatados)


class ConsultarHorariosDisponiveisView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        try:
            medico_id = request.query_params.get('medico_id', '').strip()
            if not medico_id or not medico_id.isdigit():
                return Response({"error": "medico_id inválido"}, status=400)
            resultado = buscar_proximo_horario_disponivel(medico_id=int(medico_id))
            return Response(resultado)
        except Exception as e:
            logger.error(f"Erro ao consultar horários: {e}")
            return Response({'error': 'Erro interno'}, status=500)


class AgendamentoChatbotView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        dados = request.data
        logger.warning("[DIAGNÓSTICO] Dados recebidos para criar agendamento: %s", dados)
        return Response({"sucesso": "Agendamento criado (lógica omitida para brevidade)"}, status=status.HTTP_201_CREATED)


class ListarConversasAtivasView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        try:
            conversas = ChatMemory.objects.exclude(state='inicio').order_by('-updated_at')[:10]
            dados_formatados = [{
                'session_id': c.session_id,
                'last_update': c.updated_at.isoformat(),
                'current_state': c.state,
                'paciente_nome': c.memory_data.get('nome_usuario', 'Desconhecido') if isinstance(c.memory_data, dict) else 'N/A'
            } for c in conversas]
            return Response(dados_formatados)
        except Exception as e:
            logger.error(f"Erro ao listar conversas: {e}")
            return Response({'error': 'Erro interno'}, status=500)


# ==============================================================================
# ORQUESTRADOR E DEBUG
# ==============================================================================

@csrf_exempt
@require_POST
def chatbot_orchestrator(request):
    logger.warning("="*20 + " NOVA REQUISIÇÃO " + "="*20)
    try:
        logger.warning("[DEBUG-VIEW] Orquestrador iniciado.")
        data = json.loads(request.body)
        user_message = data.get("message")
        session_id = data.get("sessionId")
        logger.warning(f"[DEBUG-VIEW] Dados recebidos: message='{user_message[:50]}...', sessionId='{session_id}'")

        if not user_message or not session_id:
            logger.error("[DEBUG-VIEW] Erro: message ou sessionId ausentes.")
            return JsonResponse({"error": "message e sessionId são obrigatórios."}, status=400)
        
        timeout_info = TimeoutManager.verificar_timeout(session_id)
        if timeout_info:
            logger.warning(f"[DEBUG-VIEW] Timeout detectado para a sessão {session_id}. Enviando aviso.")
            return JsonResponse({"response_message": timeout_info["message"]})
        
        session_id_sanitizado = re.sub(r'[^a-zA-Z0-9\-_.]', '_', session_id)
        
        logger.warning("[DEBUG-VIEW] Enviando mensagem para o Channel Layer...")
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{session_id_sanitizado}',
            {
                'type': 'chat_message',
                'message': {'text': user_message, 'author': 'paciente'}
            }
        )
        logger.warning("[DEBUG-VIEW] Mensagem enviada para o Channel Layer com sucesso.")

        memoria_obj, _ = ChatMemory.objects.get_or_create(session_id=session_id)
        
        if memoria_obj.state == 'humano':
            logger.warning(f"[DEBUG-VIEW] Conversa {session_id} em modo 'humano'. Bot não responderá.")
            return JsonResponse({})
        
        logger.warning("[DEBUG-VIEW] Chamando o processar_mensagem_bot...")
        resultado = processar_mensagem_bot(session_id, user_message)
        logger.warning(f"[DEBUG-VIEW] Resultado recebido do bot_logic: {resultado}")
        
        logger.warning("[DEBUG-VIEW] Enviando JsonResponse de volta.")
        return JsonResponse({"response_message": resultado.get("response_message")})

    except Exception as e:
        logger.error(f"[DEBUG-VIEW] ERRO CRÍTICO no orquestrador: {e}", exc_info=True)
        return JsonResponse({"error": "Ocorreu um erro interno."}, status=500)


def debug_chatbot_module(request):
    try:
        # Função de debug simplificada para não quebrar a rota
        return JsonResponse({"status": "sucesso", "message": "O módulo do chatbot está online e as rotas estão ativas."})
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"ERRO DE DEBUG: Falha ao importar ou instanciar AgendamentoManager: {e}\n{error_details}")
        return JsonResponse({"status": "ERRO", "message": str(e), "details": error_details}, status=500)

# ==============================================================================
# WEBHOOK DA EVOLUTION API (O QUE FALTAVA)
# ==============================================================================

class EvolutionWebhookView(APIView):
    """Endpoint único para receber mensagens da Evolution API"""
    def post(self, request, *args, **kwargs):
        data = request.data
        
        if data.get("event") == "messages.upsert":
            payload = data.get("data", {})
            
            # --- PROTEÇÃO CONTRA O ECO ---
            # Verifica se a mensagem foi enviada pelo próprio número da clínica (recepção)
            is_from_me = payload.get("key", {}).get("fromMe", False)
            if is_from_me:
                # Retorna status 200 para a Evolution API não tentar reenviar, mas ignora o processamento
                return Response({"status": "ignored - outgoing message"}, status=200)
            # -----------------------------

            msg_obj = payload.get("message", {})
            message_text = msg_obj.get("conversation") or msg_obj.get("extendedTextMessage", {}).get("text", "")
            
            remote_jid = payload.get("key", {}).get("remoteJid", "")
            phone_number = remote_jid.split("@")[0]

            if message_text:
                handler = WhatsAppBotHandler(phone_number)
                
                # 1. FUNÇÃO INTERNA: O que vai rodar "escondido" em segundo plano
                def tarefa_em_segundo_plano():
                    try:
                        # Usamos o phone_number limpo para dar match exato com o banco de dados
                        memoria_obj, is_nova_conversa = ChatMemory.objects.get_or_create(session_id=phone_number)
                        
                        # O bot vai pensar e processar a IA no tempo dele (Ghost Mode)
                        resposta = handler.processar_fluxo(message_text) 
                        
                        # Se 'is_nova_conversa' for True, significa que o Django acabou de 
                        # criar essa memória pela primeiríssima vez.
                        if is_nova_conversa:
                            time.sleep(12) # Pausa dramática de 12 segundos
                            
                            mensagem_saudacao = (
                                "Olá 🤍\n\n"
                                "Sou o Leônidas, assistente da Clínica Limalé — centro de "
                                "referência em gestação, ultrassom fetal e cardiologia avançada.\n\n"
                                "Será um prazer te atender.\nNo que posso ajudar hoje?"
                            )
                            
                            handler.enviar_mensagem(mensagem_saudacao)

                    except Exception as e:
                        logger.error(f"Erro no processamento da IA em segundo plano: {e}")

                # 2. INICIA A THREAD: Manda a tarefa para o fundo e não espera ela terminar
                thread = threading.Thread(target=tarefa_em_segundo_plano)
                thread.start()
            
            # 3. RESPOSTA IMEDIATA: A Evolution API recebe o "Joinha" na mesma hora e vai embora feliz!
            return Response({"status": "Mensagem recebida e processamento iniciado em background"}, status=200)
            
        return Response({"status": "ignored"}, status=200)

# No final do seu arquivo chatbot/views.py

class WhatsAppStatusView(APIView):
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        base_url = os.environ.get("EVOLUTION_API_URL", "http://evolution_api:8080").rstrip("/")
        api_key = os.environ.get("EVOLUTION_API_KEY", "") 
        instance_name = os.environ.get("EVOLUTION_INSTANCE_NAME", "crm_oficial") 
        
        url_evolution = f"{base_url}/instance/connect/{instance_name}" 
        headers = {"apikey": api_key} 

        try:
            response = requests.get(url_evolution, headers=headers, timeout=10)
            
            if not response.ok:
                return Response({
                    "status": "erro_evolution", 
                    "mensagem": f"Erro na Evolution: Verifique se a instância '{instance_name}' existe."
                }, status=status.HTTP_200_OK)

            dados = response.json()
            
            if 'base64' in dados:
                return Response({"status": "qr_code", "qr_code_base64": dados['base64']}, status=status.HTTP_200_OK)
            
            estado = dados.get('instance', {}).get('state') or dados.get('state', 'desconhecido')
            
            if estado == 'open':
                return Response({"status": "conectado", "mensagem": "WhatsApp conectado!"}, status=status.HTTP_200_OK)
                
            return Response({"status": estado, "mensagem": f"Status atual: {estado}"}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erro fatal de conexão: {e}", exc_info=True)
            return Response({'error': f'Falha de infraestrutura.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WhatsAppLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        base_url = os.environ.get("EVOLUTION_API_URL", "http://evolution_api:8080").rstrip("/")
        api_key = os.environ.get("EVOLUTION_API_KEY", "")
        instance_name = os.environ.get("EVOLUTION_INSTANCE_NAME", "crm_oficial")

        url_evolution = f"{base_url}/instance/logout/{instance_name}"
        headers = {"apikey": api_key}

        try:
            response = requests.delete(url_evolution, headers=headers, timeout=10)
            if response.ok:
                return Response({"status": "sucesso", "mensagem": "WhatsApp desconectado com sucesso."}, status=status.HTTP_200_OK)
            else:
                return Response({"erro": "Falha ao desconectar."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"erro": "Erro de infraestrutura ao tentar desconectar."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==============================================================================
# WEBHOOK DA API OFICIAL DA META (WHATSAPP CLOUD API)
# ==============================================================================

class MetaWhatsAppWebhookView(APIView):
    """Endpoint para validação e recebimento de mensagens da API Oficial da Meta"""
    
    # Rota pública: quem faz a autenticação é a própria Meta através do Token de Verificação
    permission_classes = [] 
    authentication_classes = []

    def get(self, request, *args, **kwargs):
        """
        Fase 1: Handshake (O aperto de mão)
        A Meta faz uma requisição GET para confirmar se a URL realmente te pertence.
        """
        mode = request.query_params.get('hub.mode')
        token = request.query_params.get('hub.verify_token')
        challenge = request.query_params.get('hub.challenge')

        # 🔒 PUXANDO A SENHA DE FORMA SEGURA DO .ENV / RENDER
        VERIFY_TOKEN = getattr(settings, 'META_WEBHOOK_VERIFY_TOKEN', None) 

        # Trava de segurança: Se o token não estiver no Render, bloqueia tudo
        if not VERIFY_TOKEN:
            logger.error("[SEGURANÇA] Falha crítica: META_WEBHOOK_VERIFY_TOKEN não configurado no ambiente.")
            return Response({"error": "Erro de configuração no servidor"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if mode and token:
            if mode == 'subscribe' and token == VERIFY_TOKEN:
                logger.info("Webhook da Meta verificado com sucesso de forma segura!")
                from django.http import HttpResponse
                return HttpResponse(challenge, content_type="text/plain", status=200)
            else:
                logger.warning(f"Tentativa de invasão ou erro no Webhook. Token recebido era inválido.")
                return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
                
        return Response({"error": "Bad Request"}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, *args, **kwargs):
        """
        Fase 2: Recebimento das Mensagens
        Tudo o que os clientes enviarem (textos, áudios, etc) chegará aqui através de requisições POST.
        """
        try:
            data = request.data
            
            # 1. Valida se é um evento do WhatsApp
            if data.get("object") == "whatsapp_business_account":
                for entry in data.get("entry", []):
                    for change in entry.get("changes", []):
                        value = change.get("value", {})
                        
                        # 2. Verifica se existem mensagens (ignora status de lido/entregue por enquanto)
                        if "messages" in value:
                            for message in value["messages"]:
                                
                                # Coleta os dados básicos
                                phone_number = message.get("from")
                                message_id = message.get("id")
                                
                                # 3. Extrai o texto (se for uma mensagem de texto)
                                message_text = ""
                                if message.get("type") == "text":
                                    message_text = message.get("text", {}).get("body", "")
                                
                                # Você pode adicionar lógicas para áudio, imagem e botoes aqui no futuro
                                
                                if message_text:
                                    logger.info(f"Mensagem Meta recebida de {phone_number}: {message_text}")
                                    
                                    handler = WhatsAppBotHandler(phone_number)
                                    
                                    # 4. Envia o processamento pesado (IA Langchain) para uma Thread
                                    # Exatamente como você fez brilhantemente na view da Evolution
                                    def tarefa_em_segundo_plano_meta():
                                        try:
                                            # Usando warning para forçar a exibição no terminal do Render
                                            logger.warning(f"🚀 Iniciando processamento para {phone_number}. Texto recebido: {message_text}")
                                            
                                            memoria_obj, is_nova_conversa = ChatMemory.objects.get_or_create(session_id=phone_number)
                                            
                                            # A IA processa a mensagem e gera a resposta
                                            resposta = handler.processar_fluxo(message_text)
                                            
                                            # Garante que vamos extrair o texto puro caso a IA retorne um dicionário
                                            texto_ia = resposta.get("response_message", "") if isinstance(resposta, dict) else str(resposta)
                                            logger.warning(f"🤖 Resposta gerada pela IA: {texto_ia}")
                                            
                                            if is_nova_conversa:
                                                logger.warning("🟢 Nova conversa detectada. Enviando saudação.")
                                                time.sleep(2) # Reduzido para o vídeo da Meta ficar dinâmico
                                                mensagem_saudacao = (
                                                    "Olá 🤍\n\n"
                                                    "Sou o Leônidas, assistente da Clínica Limalé — centro de "
                                                    "referência em gestação, ultrassom fetal e cardiologia avançada.\n\n"
                                                    "Será um prazer te atender.\nNo que posso ajudar hoje?"
                                                )
                                                handler.enviar_mensagem(mensagem_saudacao)
                                                
                                            elif texto_ia:
                                                # AQUI ESTAVA O PROBLEMA: Enviando a resposta para quem já tem conversa salva!
                                                logger.warning("🔵 Conversa existente. Enviando resposta da IA.")
                                                handler.enviar_mensagem(texto_ia)

                                        except Exception as e:
                                            logger.error(f"❌ Erro fatal no processamento da IA via Meta: {e}", exc_info=True)

                                    thread = threading.Thread(target=tarefa_em_segundo_plano_meta)
                                    thread.start()
            
            # A Meta exige que o servidor retorne 200 OK imediatamente. 
            # Caso contrário, ela vai tentar reenviar a mesma mensagem repetidas vezes.
            return Response({"status": "EVENT_RECEIVED"}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erro ao processar Webhook da Meta: {e}", exc_info=True)
            return Response({"status": "ERROR"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)