# chatbot/views.py - VERSÃO CORRIGIDA E ORGANIZADA

# --- SEÇÃO DE IMPORTAÇÕES PADRÃO E DJANGO ---
import re
import os
import json
import logging
from datetime import datetime, time, timedelta
from dateutil import parser

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
# A linha abaixo foi removida pois causava erro e não estava em uso.
# from langchain_core.memory import ConversationBufferMemory 

# --- SEÇÃO DE IMPORTAÇÕES DO SEU PROJETO ---
from .models import ChatMemory
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
load_dotenv()
logger = logging.getLogger(__name__)


# ... (CadastrarPacienteView e ConsultarAgendamentosPacienteView não mudam) ...
class CadastrarPacienteView(APIView):
    permission_classes = [HasAPIKey]
    def post(self, request):
        cpf = request.data.get('cpf')
        email = request.data.get('email')
        if cpf:
            cpf = re.sub(r'\D', '', cpf)
        if Paciente.objects.filter(cpf=cpf).exists():
            return Response({'error': 'Um paciente com este CPF já está cadastrado.'}, status=status.HTTP_409_CONFLICT)
        if Paciente.objects.filter(email=email).exists():
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
            agendamentos = Agendamento.objects.filter(paciente=paciente).order_by('-data_hora_inicio')
            dados_formatados = [
                {
                    "id": ag.id,
                    "data_hora": timezone.localtime(ag.data_hora_inicio).strftime('%d/%m/%Y às %H:%M'),
                    "status": ag.status,
                    "procedimento": ag.procedimento.descricao if ag.procedimento else "Não especificado"
                }
                for ag in agendamentos
            ]
            return Response(dados_formatados)
        except Paciente.DoesNotExist:
            return Response({"error": "Paciente com este CPF não encontrado."}, status=status.HTTP_404_NOT_FOUND)

class VerificarPacienteCPFView(APIView):
    """
    Endpoint simples que verifica se um paciente existe usando apenas o CPF.
    """
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
        
# --- NOVAS VIEWS PARA DAR INTELIGÊNCIA AO CHATBOT ---

class ListarEspecialidadesView(generics.ListAPIView):
    """
    NOVO: Endpoint para o N8N buscar a lista de especialidades disponíveis
    e seus respectivos valores de consulta particular.
    """
    permission_classes = [HasAPIKey]
    queryset = Especialidade.objects.all().order_by('nome')
    serializer_class = EspecialidadeSerializer

class ListarMedicosPorEspecialidadeView(generics.ListAPIView):
    """
    NOVO: Endpoint para o N8N buscar os médicos de uma determinada especialidade.
    Exemplo de chamada: /api/chatbot/medicos/?especialidade_id=1
    """
    permission_classes = [HasAPIKey]
    serializer_class = UserSerializer # Reutilizamos o serializer principal de usuário

    def get_queryset(self):
        queryset = CustomUser.objects.filter(cargo='medico', is_active=True)
        especialidade_id = self.request.query_params.get('especialidade_id')
        if especialidade_id:
            queryset = queryset.filter(especialidades__id=especialidade_id)
        return queryset

# --- VIEWS EXISTENTES QUE SERÃO REFATORADAS ---

class ListarProcedimentosView(generics.ListAPIView): # Mudamos para generics.ListAPIView para padronizar
    """
    REFATORADO: Endpoint para listar procedimentos, que já existia.
    """
    permission_classes = [HasAPIKey]
    queryset = Procedimento.objects.filter(valor_particular__gt=0, ativo=True).exclude(descricao__iexact='consulta')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        dados_formatados = [
            {"id": proc.id, "nome": proc.descricao, "valor": f"{proc.valor_particular:.2f}".replace('.', ',')}
            for proc in queryset
        ]
        return Response(dados_formatados)


# ########################################################################## #
# ################ INÍCIO DA SEÇÃO MODIFICADA ################################ #
# ########################################################################## #

class ConsultarHorariosDisponiveisView(APIView):
    """
    API final. Busca o próximo dia com horários disponíveis
    baseado na JORNADA DE TRABALHO REAL do médico cadastrada no Admin.
    """
    permission_classes = [HasAPIKey] # Protege a API com a chave

    def _buscar_horarios_no_dia(self, data_desejada, medico):
        """
        Calcula os horários livres em um dia específico para um médico.
        """
        DURACAO_CONSULTA_MINUTOS = 30 # Duração de cada slot de agendamento
        print(f"\n[DEBUG-HORARIOS] Verificando dia: {data_desejada.strftime('%Y-%m-%d')}")

        # 1. Busca a jornada de trabalho REAL do médico no banco de dados
        dia_semana_desejado = data_desejada.weekday()
        jornadas_do_dia = JornadaDeTrabalho.objects.filter(
            medico=medico, 
            dia_da_semana=dia_semana_desejado
        )
        print(f"[DEBUG-HORARIOS] Dia da semana: {dia_semana_desejado}. Jornadas encontradas: {jornadas_do_dia.count()}")

        if not jornadas_do_dia.exists():
            print("[DEBUG-HORARIOS] -> Fim da verificação: Médico não trabalha neste dia da semana.")
            return []

        # 2. Busca os agendamentos já existentes e confirmados
        agendamentos_existentes = Agendamento.objects.filter(
            medico=medico,
            data_hora_inicio__date=data_desejada,
            status__in=['Agendado', 'Confirmado']
        ).values_list('data_hora_inicio', flat=True)

        horarios_ocupados = {ag.astimezone(timezone.get_current_timezone()) for ag in agendamentos_existentes}
        print(f"[DEBUG-HORARIOS] Horários já ocupados: {[h.strftime('%H:%M') for h in horarios_ocupados]}")

        horarios_disponiveis_dia = []
        agora = timezone.now()
        print(f"[DEBUG-HORARIOS] Hora atual (servidor): {agora.strftime('%Y-%m-%d %H:%M:%S %Z')}")

        for turno in jornadas_do_dia:
            print(f"[DEBUG-HORARIOS] Verificando turno: {turno.hora_inicio.strftime('%H:%M')} - {turno.hora_fim.strftime('%H:%M')}")
            horario_slot = timezone.make_aware(datetime.datetime.combine(data_desejada, turno.hora_inicio))

            while horario_slot.time() < turno.hora_fim:
                print(f"[DEBUG-HORARIOS]  -> Checando slot: {horario_slot.strftime('%H:%M')}", end='')

                if horario_slot <= agora:
                    print(" -> Rejeitado (está no passado)")
                elif horario_slot in horarios_ocupados:
                    print(" -> Rejeitado (está ocupado)")
                else:
                    print(" -> ACEITO!")
                    horarios_disponiveis_dia.append(horario_slot.strftime('%H:%M'))

                horario_slot += timedelta(minutes=DURACAO_CONSULTA_MINUTOS)

        print(f"[DEBUG-HORARIOS] -> Fim da verificação. Total de horários livres no dia: {len(horarios_disponiveis_dia)}")
        return sorted(horarios_disponiveis_dia)

    def get(self, request):
        medico_id = request.query_params.get('medico_id')
        if not medico_id:
            return Response({"error": "O parâmetro 'medico_id' é obrigatório."}, status=400)
        
        # Apenas chama a função centralizada e retorna o resultado
        resultado = buscar_proximo_horario_disponivel(medico_id=medico_id)
        return Response(resultado)

        data_atual = timezone.localdate()
        for i in range(90):
            data_a_verificar = data_atual + timedelta(days=i)
            horarios = self._buscar_horarios_no_dia(data_a_verificar, medico)

            if horarios:
                print(f"--- [API-HORARIOS] SUCESSO! Encontrados horários no dia {data_a_verificar}. Retornando resposta. ---")
                return Response({
                    "data": data_a_verificar.strftime('%Y-%m-%d'),
                    "horarios_disponiveis": horarios
                })

        print("--- [API-HORARIOS] FALHA. Nenhum horário encontrado nos próximos 90 dias. ---")
        return Response({"data": None, "horarios_disponiveis": []})

# ########################################################################## #
# ################# FIM DA SEÇÃO MODIFICADA ################################## #
# ########################################################################## #


class AgendamentoChatbotView(APIView):
    """
    REFATORADO: A view principal de criação de agendamento agora retorna
    os dados do PIX diretamente na sua resposta, eliminando a necessidade de uma segunda chamada.
    """
    permission_classes = [HasAPIKey]

    def post(self, request):
        dados = request.data
        logger.warning("[DIAGNÓSTICO] Dados recebidos do N8N: %s", dados)
        
        metodo_pagamento = dados.get('metodo_pagamento_escolhido', 'PIX')
        logger.warning("[DIAGNÓSTICO] Método de pagamento escolhido: %s", metodo_pagamento)
        
        cpf_paciente = dados.get('cpf')
        try:
            paciente = Paciente.objects.get(cpf=re.sub(r'\D', '', cpf_paciente))
            data_hora_inicio_str = dados.get('data_hora_inicio')
            if not data_hora_inicio_str:
                raise ValueError("data_hora_inicio está ausente")
            data_hora_inicio = parser.isoparse(data_hora_inicio_str)
            data_hora_fim = data_hora_inicio + timedelta(minutes=50)
        except Paciente.DoesNotExist:
            return Response({'error': f'Paciente com CPF {cpf_paciente} não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        except (ValueError, TypeError, parser.ParserError):
            return Response({'error': 'Formato de data inválido ou ausente.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Monta a base do agendamento
        dados_agendamento = {
            'paciente': paciente.id,
            'data_hora_inicio': data_hora_inicio,
            'data_hora_fim': data_hora_fim,
            'status': 'Agendado',
            'tipo_atendimento': 'Particular',
            'tipo_agendamento': dados.get('tipo_agendamento')
        }

        # Lógica condicional (sem alterações)
        if dados.get('tipo_agendamento') == 'Consulta':
            dados_agendamento['especialidade'] = dados.get('especialidade_id')
            dados_agendamento['medico'] = dados.get('medico_id')
            dados_agendamento['modalidade'] = dados.get('modalidade', 'Presencial')
        elif dados.get('tipo_agendamento') == 'Procedimento':
            dados_agendamento['procedimento'] = dados.get('procedimento_id')
        else:
            return Response({'error': "O campo 'tipo_agendamento' ('Consulta' ou 'Procedimento') é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AgendamentoWriteSerializer(data=dados_agendamento)
        if serializer.is_valid():
            agendamento = serializer.save()
            
            try:
                usuario_servico = CustomUser.objects.get(username='servico_chatbot')
            except CustomUser.DoesNotExist:
                usuario_servico = CustomUser.objects.filter(is_superuser=True).first()

            # Passa o método de pagamento para o serviço
            agendamento_services.criar_agendamento_e_pagamento_pendente(
                agendamento, 
                usuario_servico,
                metodo_pagamento_escolhido=metodo_pagamento,
                initiated_by_chatbot=True  # <-- ADICIONE ESTE PARÂMETRO
            )
            
            # --- CORREÇÃO PRINCIPAL AQUI ---
            # Recarrega o objeto 'agendamento' com os dados mais recentes do banco de dados,
            # incluindo a relação com o 'pagamento' que o serviço acabou de criar.
            agendamento.refresh_from_db()
            # --------------------------------

            # Agora, a lógica de resposta vai funcionar
            pagamento_associado = agendamento.pagamento
            dados_pagamento = {}

            if hasattr(pagamento_associado, 'pix_copia_e_cola') and pagamento_associado.pix_copia_e_cola:
                dados_pagamento['tipo'] = 'PIX'
                dados_pagamento['pix_copia_e_cola'] = pagamento_associado.pix_copia_e_cola
                dados_pagamento['pix_qr_code_imagem'] = pagamento_associado.pix_qr_code_base64
            elif hasattr(pagamento_associado, 'link_pagamento') and pagamento_associado.link_pagamento:
                dados_pagamento['tipo'] = 'CartaoCredito'
                dados_pagamento['link'] = pagamento_associado.link_pagamento

            resposta_final = {
                'sucesso': "Agendamento criado! Realize o pagamento para confirmar.", 
                'agendamento_id': agendamento.id,
                'pagamento_id': pagamento_associado.id if pagamento_associado else None,
                'dados_pagamento': dados_pagamento
            }
            
            return Response(resposta_final, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- CÉREBRO DA IA ROTEADORA (ORQUESTRADOR) ---
# --- CÉREBRO 1: IA ROTEADORA DE INTENÇÕES ---
prompt_roteador = ChatPromptTemplate.from_messages([
    ("system", """
    # MISSÃO
    Você é um assistente de IA roteador. Sua única função é analisar a mensagem do usuário para determinar a intenção principal.
    # FORMATO DE SAÍDA OBRIGATÓRIO
    Sua saída DEVE SER SEMPRE um objeto JSON único, contendo a chave "intent".
    # INTENÇÕES POSSÍVEIS
    - "saudacao": Para saudações como "oi", "bom dia", "olá".
    - "iniciar_agendamento": Quando o usuário explicitamente pede para marcar uma consulta, exame ou ver horários.
    - "triagem_sintomas": QUANDO O USUÁRIO DESCREVE UM PROBLEMA DE SAÚDE OU SINTOMA.
    """),
    ("human", "{user_message}")
])

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash", 
    temperature=0,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)
parser = JsonOutputParser()
chain_roteadora = prompt_roteador | llm | parser


# --- CÉREBRO 2: IA DE TRIAGEM DE SINTOMAS (VERSÃO CORRIGIDA FINAL) ---
lista_especialidades_para_ia = "Cardiologia, Ginecologia, Neonatologia, Obstetrícia, Ortopedia, Pediatria, Reumatologia Pediátrica"

# SUBSTITUA COMPLETAMENTE O PROMPT_SINTOMAS POR ESTE
prompt_sintomas = ChatPromptTemplate.from_messages([
    ("system", f"""
    # MISSÃO
    Você é um assistente de triagem médica. Sua função é analisar sintomas e sugerir a especialidade médica mais apropriada DENTRO DA LISTA DE OPÇÕES VÁLIDAS.

    # REGRAS CRÍTICAS
    - JAMAIS forneça diagnósticos ou conselhos médicos.
    - Se os sintomas forem muito vagos, responda com "Clinico Geral".

    # ESPECIALIDADES VÁLIDAS
    {lista_especialidades_para_ia}

    # FORMATO DE SAÍDA OBRIGATÓRIO
    Sua saída DEVE SER SEMPRE um objeto JSON único, contendo apenas a chave "especialidade_sugerida".
    """),
    
    # --- INÍCIO DO EXEMPLO PRÁTICO (FEW-SHOT) ---
    # Aqui nós MOSTRAMOS para a IA o que esperamos
    ("human", "Estou com o coração acelerado e dor no peito."),
    ("ai", '{ "especialidade_sugerida": "Cardiologia" }'),
    # --- FIM DO EXEMPLO ---
    
    # Aqui entra a pergunta real do usuário
    ("human", "{sintomas_do_usuario}")
])

# O resto do seu arquivo (a definição da chain e do orquestrador) permanece exatamente o mesmo.
chain_sintomas = prompt_sintomas | llm | parser
def _buscar_preco_servico(base_url, entity):
    logger.info(f"--- INICIANDO BUSCA DE PREÇO PARA: '{entity}' ---")
    api_key = os.getenv('API_KEY_CHATBOT')
    if not api_key:
        logger.error("!!! ERRO CRÍTICO: API_KEY_CHATBOT não encontrada nas variáveis de ambiente.")
        return "Desculpe, estou com um problema interno de configuração para buscar preços."
    
    headers = {'Api-Key': api_key}
    
    if not base_url.endswith('/'):
        base_url += '/'

    try:
        url_especialidades = f"{base_url}api/chatbot/especialidades/"
        logger.info(f"Chamando API de especialidades: {url_especialidades}")
        resp_especialidades = requests.get(url_especialidades, headers=headers, timeout=10)
        resp_especialidades.raise_for_status()
        logger.info("Sucesso ao buscar especialidades.")
        
        url_procedimentos = f"{base_url}api/chatbot/procedimentos/"
        logger.info(f"Chamando API de procedimentos: {url_procedimentos}")
        resp_procedimentos = requests.get(url_procedimentos, headers=headers, timeout=10)
        resp_procedimentos.raise_for_status()
        logger.info("Sucesso ao buscar procedimentos.")

        especialidades_data = resp_especialidades.json()
        procedimentos_data = resp_procedimentos.json()
        todos_os_servicos = especialidades_data + procedimentos_data
        logger.info(f"Total de {len(todos_os_servicos)} serviços carregados para busca.")

        servico_encontrado = next((s for s in todos_os_servicos if s['nome'].lower() == entity.lower()), None)
        if not servico_encontrado:
            servico_encontrado = next((s for s in todos_os_servicos if entity.lower() in s['nome'].lower()), None)

        if servico_encontrado and servico_encontrado.get('valor'):
            resultado = f"O valor para {servico_encontrado['nome']} é de R$ {servico_encontrado['valor']}."
            logger.info(f"Preço encontrado: {resultado}")
            return resultado
        else:
            logger.warning(f"Serviço '{entity}' não encontrado na lista de preços.")
            return f"Não encontrei um preço para o serviço '{entity}'. Por favor, verifique o nome."

    except requests.exceptions.RequestException as e:
        logger.error(f"ERRO DE CONEXÃO ao chamar APIs de serviço: {e}")
        return "Desculpe, estou com um problema para me conectar ao sistema de preços no momento."
    except Exception as e:
        logger.error(f"ERRO INESPERADO na busca de preço: {e}")
        return "Ocorreu um erro inesperado ao buscar as informações de preço."

# --- ORQUESTRADOR PRINCIPAL DA CONVERSA ---
@csrf_exempt
@require_POST
def chatbot_orchestrator(request):
    """
    Esta view orquestra TODA a conversa.
    VERSÃO FINAL COM TODAS AS IAs E FLUXOS CORRETAMENTE CONECTADOS.
    """
    try:
        data = json.loads(request.body)
        user_message = data.get("message")
        session_id = data.get("sessionId")
        
        if not user_message or not session_id:
            return JsonResponse({"error": "message e sessionId são obrigatórios."}, status=400)

        memoria_obj, created = ChatMemory.objects.get_or_create(
            session_id=session_id,
            defaults={'memory_data': {}, 'state': 'inicio'}
        )
        memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
        estado_atual = memoria_obj.state
        logger.warning(f"\n--- INÍCIO DA REQUISIÇÃO ---")
        logger.warning(f"[DEBUG CHATBOT] Session ID: {session_id}, Estado: '{estado_atual}', Mensagem: '{user_message}'")
        
        # --- LÓGICA PRINCIPAL (ROTEAMENTO DA CONVERSA) ---

        if estado_atual and estado_atual.startswith(('agendamento_', 'cadastro_', 'triagem_')):
            logger.warning(f"Rota: CONTINUANDO FLUXO '{estado_atual}'.")
            manager = AgendamentoManager(
                session_id=session_id,
                memoria=memoria_atual,
                base_url=request.build_absolute_uri('/'),
                chain_sintomas=chain_sintomas # GARANTIA: Passando a chain completa
            )
            resultado = manager.processar(user_message, estado_atual)
            resposta_final = resultado.get("response_message")
            novo_estado = resultado.get("new_state")
            nova_memoria = resultado.get("memory_data")

        elif estado_atual == 'aguardando_nome':
            nova_memoria = memoria_atual
            nome_usuario = user_message.strip().title()
            nova_memoria['nome_usuario'] = nome_usuario
            resposta_final = f"Certo, {nome_usuario}. Pode me contar como posso te ajudar?"
            novo_estado = 'identificando_demanda'

        elif estado_atual == 'identificando_demanda':
            logger.warning("Rota: IDENTIFICANDO DEMANDA (IA Roteadora).")
            intent_data = chain_roteadora.invoke({"user_message": user_message})
            intent = intent_data.get("intent")
            logger.warning(f"Intenção Detectada: '{intent}'")

            if intent == "iniciar_agendamento":
                manager = AgendamentoManager(session_id, memoria_atual, request.build_absolute_uri('/'))
                resultado = manager.processar(user_message, 'agendamento_inicio')
                resposta_final = resultado.get("response_message")
                novo_estado = resultado.get("new_state")
                nova_memoria = resultado.get("memory_data")
            elif intent == "triagem_sintomas":
                resposta_final = "Entendo sua preocupação. Para que eu possa te ajudar a identificar a especialidade mais adequada, pode me descrever um pouco melhor o que você está sentindo?"
                novo_estado = 'triagem_awaiting_description'
                nova_memoria = memoria_atual
            else:
                resposta_final = "Desculpe, não entendi bem. Você gostaria de agendar uma consulta, um exame, ou saber um preço?"
                novo_estado = 'identificando_demanda'
                nova_memoria = memoria_atual
        else:
            logger.warning("Rota: INICIANDO NOVA CONVERSA.")
            if memoria_atual.get('nome_usuario'):
                resposta_final = f"Olá, {memoria_atual.get('nome_usuario')}, bem-vindo(a) de volta! Como posso te ajudar hoje?"
                novo_estado = 'identificando_demanda'
            else:
                resposta_final = "Olá, seja bem-vindo à Clínica Limalé.\nEu sou o Leônidas, e vou dar sequência no seu atendimento.\nPode me passar seu nome?"
                novo_estado = 'aguardando_nome'
            nova_memoria = memoria_atual
        
        memoria_obj.state = novo_estado
        memoria_obj.memory_data = nova_memoria
        memoria_obj.save()

        logger.warning(f"Resposta Final Enviada: '{resposta_final[:100]}...'")
        return JsonResponse({"response_message": resposta_final})

    except Exception as e:
        logger.error(f"ERRO CRÍTICO no orquestrador do chatbot: {e}", exc_info=True)
        return JsonResponse({"error": "Ocorreu um erro interno."}, status=500)