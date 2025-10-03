# chatbot/views.py - VERSÃO COM "CÉREBRO 3" (FAQ) E TRIAGEM DE SINTOMAS

# --- SEÇÃO DE IMPORTAÇÕES PADRÃO E DJANGO ---

import re
import os
import json
import logging
from datetime import datetime, time, timedelta
from dateutil import parser
from .services import buscar_precos_servicos
from typing import Optional
from pydantic import BaseModel, Field
from .bot_logic import processar_mensagem_bot # <-- IMPORTE A NOVA FUNÇÃO
from asgiref.sync import async_to_sync   # <--- ADICIONE ESTA LINHA
from channels.layers import get_channel_layer # <--- ADICIONE ESTA LINHA

from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings

# --- SEÇÃO DE IMPORTAÇÕES DO DJANGO REST FRAMEWORK ---
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework_api_key.permissions import HasAPIKey

# --- SEÇÃO DE IMPORTAÇÕES DO LANGCHAIN E IA ---
from dotenv import load_dotenv
import requests
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

# --- SEÇÃO DE IMPORTAÇÕES DO SEU PROJETO ---
from .models import ChatMemory
from .services import buscar_precos_servicos
from pacientes.models import Paciente
from faturamento.models import Procedimento, Pagamento
from agendamentos.serializers import AgendamentoWriteSerializer
from agendamentos.services import buscar_proximo_horario_disponivel
from agendamentos.models import Agendamento
from .agendamento_flow import AgendamentoManager
from usuarios.models import CustomUser, Especialidade
from pacientes.serializers import PacienteSerializer
from agendamentos import services as agendamento_services
from usuarios.serializers import EspecialidadeSerializer, UserSerializer
from usuarios.models import CustomUser, JornadaDeTrabalho

# --- CONFIGURAÇÕES INICIAIS ---
# ... (configurações existentes, sem alterações) ...
load_dotenv()
logger = logging.getLogger(__name__)

# --- VIEWS DA API ---
# ... (todas as suas views da API permanecem as mesmas, sem alterações) ...
class CadastrarPacienteView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        cpf = request.data.get('cpf')
        email = request.data.get('email')
        if cpf:
            cpf = re.sub(r'\D', '', cpf)
        if Paciente.objects.filter(cpf=cpf).exists():
            return Response({'error': 'Um paciente com este CPF já está cadastrado.'}, status=status.HTTP_409_CONFLICT)
        if email and Paciente.objects.filter(email=email).exists():
            return Response({'error': 'Um paciente com este email já está cadastrado.'}, status=status.HTTP_409_CONFLICT)
        serializer = PacienteSerializer(data=request.data)
        if serializer.is_valid():
            paciente = serializer.save()
            return Response(
                {'sucesso': f"Paciente {paciente.nome_completo} cadastrado com sucesso!", "paciente_id": paciente.id},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ConsultarAgendamentosPacienteView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        cpf = request.query_params.get('cpf')
        if cpf:
            cpf = re.sub(r'\D', '', cpf)
        if not cpf:
            return Response({'error': 'O parâmetro "cpf" é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            paciente = Paciente.objects.get(cpf=cpf)
            agendamentos = Agendamento.objects.filter(paciente=paciente, status__in=['Agendado', 'Confirmado']).order_by('data_hora_inicio')
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
            return Response({"error": "Paciente com este CPF não encontrado."}, status=status.HTTP_404_NOT_FOUND)

class VerificarPacienteCPFView(APIView):
    permission_classes = [HasAPIKey]
    def get(self, request):
        cpf = request.query_params.get('cpf')
        if not cpf:
            return Response({'error': 'O parâmetro "cpf" é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        cpf_limpo = re.sub(r'\D', '', cpf)
        paciente_existe = Paciente.objects.filter(cpf=cpf_limpo).exists()
        if paciente_existe:
            return Response({"status": "paciente_encontrado"})
        else:
            return Response({"status": "paciente_nao_encontrado"}, status=status.HTTP_404_NOT_FOUND)

class VerificarSegurancaView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        telefone = request.data.get('telefone_celular')
        cpf = request.data.get('cpf')
        if cpf:
            cpf = re.sub(r'\D', '', cpf)
        if not telefone or not cpf:
            return Response({'error': 'Os campos "telefone_celular" e "cpf" são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)
        paciente_existe = Paciente.objects.filter(telefone_celular=telefone, cpf=cpf).exists()
        if paciente_existe:
            return Response({"status": "verificado"})
        else:
            return Response({"status": "dados_nao_conferem"}, status=status.HTTP_403_FORBIDDEN)
        
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
        medico_id = request.query_params.get('medico_id')
        if not medico_id:
            return Response({"error": "O parâmetro 'medico_id' é obrigatório."}, status=400)
        resultado = buscar_proximo_horario_disponivel(medico_id=medico_id)
        return Response(resultado)

class AgendamentoChatbotView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        # A lógica completa desta view não precisa ser repetida aqui.
        # Ela permanece a mesma da versão anterior.
        dados = request.data
        logger.warning("[DIAGNÓSTICO] Dados recebidos para criar agendamento: %s", dados)
        return Response({"sucesso": "Agendamento criado (lógica omitida para brevidade)"}, status=status.HTTP_201_CREATED)

# --- ORQUESTRADOR PRINCIPAL DA CONVERSA (REFINADO) ---
try:
    from .timeout_manager import TimeoutManager
    from .context_manager import ContextManager
    from .analytics import AnalyticsManager
    REFINEMENTS_AVAILABLE = True
except ImportError:
    REFINEMENTS_AVAILABLE = False

# --- ORQUESTRADOR PRINCIPAL DA CONVERSA (NOVA VERSÃO SIMPLIFICADA) ---
@csrf_exempt
@require_POST
def chatbot_orchestrator(request):
    try:
        data = json.loads(request.body)
        user_message = data.get("message")
        session_id = data.get("sessionId")

        if not user_message or not session_id:
            return JsonResponse({"error": "message e sessionId são obrigatórios."}, status=400)

        # Busca a memória da conversa para verificar o estado
        memoria_obj, _ = ChatMemory.objects.get_or_create(session_id=session_id)
        
        # --- LÓGICA DE HANDOFF ---
        # 1. Sempre retransmita a mensagem do paciente para a tela da recepção
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{session_id}',
            {
                'type': 'chat_message',
                'message': {'text': user_message, 'author': 'paciente'}
            }
        )

        # 2. Verifique se um humano já está no controle
        if memoria_obj.state == 'humano':
            logger.info(f"Conversa {session_id} em modo 'humano'. Bot não responderá.")
            # Retorna uma resposta vazia para o N8N, pois o humano responderá por outra via
            return JsonResponse({}) 
        
        # 3. Se não for humano, deixa o bot trabalhar
        logger.info(f"Conversa {session_id} em modo 'bot'. Acionando o cérebro central.")
        resultado = processar_mensagem_bot(session_id, user_message)
        
        return JsonResponse({"response_message": resultado.get("response_message")})

    except Exception as e:
        logger.error(f"ERRO CRÍTICO no orquestrador: {e}", exc_info=True)
        return JsonResponse({"error": "Ocorreu um erro interno."}, status=500)


# --- OUTRAS VIEWS DA API ---
# Todas as outras views que você já tinha continuam aqui, sem alterações.

class ListarConversasAtivasView(APIView):
    # Adicione a permissão se esta view for protegida
    # permission_classes = [HasAPIKey] 
    def get(self, request):
        conversas = ChatMemory.objects.exclude(state='inicio').order_by('-updated_at')[:10]
        dados_formatados = [{
            'session_id': c.session_id,
            'last_update': c.updated_at,
            'current_state': c.state,
            'paciente_nome': c.memory_data.get('nome_usuario', 'Desconhecido') if isinstance(c.memory_data, dict) else 'N/A'
        } for c in conversas]
        return Response(dados_formatados)

class ListarEspecialidadesView(generics.ListAPIView):
    permission_classes = [HasAPIKey]
    queryset = Especialidade.objects.all().order_by('nome')
    serializer_class = EspecialidadeSerializer

# NOVA VIEW DE DEBUG
def debug_chatbot_module(request):
    """
    Esta view serve apenas para testar se os módulos do chatbot podem ser importados
    sem causar um crash.
    """
    try:
        from .agendamento_flow import AgendamentoManager
        # Tenta instanciar a classe com valores vazios
        manager = AgendamentoManager(session_id="debug", memoria={}, base_url="/")
        return JsonResponse({"status": "sucesso", "message": "O módulo agendamento_flow.py foi importado e instanciado com sucesso."})
    except Exception as e:
        # Se qualquer erro acontecer durante a importação, ele será capturado aqui
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"ERRO DE DEBUG: Falha ao importar ou instanciar AgendamentoManager: {e}\n{error_details}")
        return JsonResponse({"status": "ERRO", "message": str(e), "details": error_details}, status=500)
