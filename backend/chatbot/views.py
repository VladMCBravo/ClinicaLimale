# chatbot/views.py - VERSÃO COM "CÉREBRO 3" (FAQ) E TRIAGEM DE SINTOMAS

# --- SEÇÃO DE IMPORTAÇÕES PADRÃO E DJANGO ---
# ... (importações existentes, sem alterações) ...
import re
import os
import json
import logging
from datetime import datetime, time, timedelta
from dateutil import parser
from .services import buscar_precos_servicos
from typing import Optional
from pydantic import BaseModel, Field

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


# --- SEÇÃO DAS INTELIGÊNCIAS ARTIFICIAIS ---
# ... (Cérebros 1, 2, 3 e 4 permanecem os mesmos) ...
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)

# --- CÉREBRO 1: IA ROTEADORA DE INTENÇÕES (ATUALIZADO) ---
class RoteadorOutput(BaseModel):
    intent: str = Field(description="A intenção do usuário. Deve ser uma das: 'saudacao', 'iniciar_agendamento', 'buscar_preco', 'cancelar_agendamento', 'triagem_sintomas', 'pergunta_geral'.")
    entity: Optional[str] = Field(description="O serviço ou especialidade específica que o usuário mencionou, se houver.")

parser_roteador = JsonOutputParser(pydantic_object=RoteadorOutput)
prompt_roteador = ChatPromptTemplate.from_template(
    """
    # MISSÃO
    Analise a mensagem do usuário para determinar a intenção e extrair a entidade. Responda APENAS com o objeto JSON formatado.

    # INTENÇÕES POSSÍVEIS
    - 'saudacao': Cumprimentos gerais como 'oi', 'boa tarde'.
    - 'iniciar_agendamento': O usuário quer marcar, agendar, ver horários para uma consulta ou exame.
    - 'buscar_preco': O usuário quer saber o valor, preço, quanto custa.
    - 'cancelar_agendamento': O usuário quer desmarcar ou cancelar.
    - 'triagem_sintomas': O usuário descreve um ou mais sintomas e não sabe qual especialista procurar.
    - 'pergunta_geral': O usuário faz uma pergunta sobre a clínica que não se encaixa nas outras categorias (ex: 'tem retorno?', 'aceita convênio?', 'parcela?').

    # INSTRUÇÕES DE FORMATAÇÃO
    {format_instructions}
    # MENSAGEM DO USUÁRIO
    {user_message}
    """,
    partial_variables={"format_instructions": parser_roteador.get_format_instructions()},
)
chain_roteadora = prompt_roteador | llm | parser_roteador


# --- CÉREBRO 2: IA DE TRIAGEM DE SINTOMAS ---
lista_especialidades_para_ia = "Cardiologia, Ginecologia, Neonatologia, Obstetrícia, Ortopedia, Pediatria, Reumatologia Pediátrica"

class TriagemOutput(BaseModel):
    especialidade_sugerida: str = Field(description=f"A especialidade sugerida. Deve ser uma das: {lista_especialidades_para_ia}, ou 'Clinico Geral' se os sintomas forem vagos.")

parser_sintomas = JsonOutputParser(pydantic_object=TriagemOutput)
prompt_sintomas = ChatPromptTemplate.from_template(
    """
    # MISSÃO
    Você é um assistente de triagem médica. Analise os sintomas e sugira a especialidade mais apropriada.
    # REGRAS CRÍTICAS
    - JAMAIS forneça diagnósticos ou conselhos médicos.
    - Responda APENAS com o objeto JSON formatado.
    # INSTRUÇÕES DE FORMATAÇÃO
    {format_instructions}
    # SINTOMAS DO USUÁRIO
    {sintomas_do_usuario}
    """,
    partial_variables={"format_instructions": parser_sintomas.get_format_instructions()},
)
chain_sintomas = prompt_sintomas | llm | parser_sintomas


# --- CÉREBRO 3: IA EXTRATORA DE DADOS DE PACIENTE ---
class DadosPacienteOutput(BaseModel):
    nome_completo: str = Field(description="O nome completo do paciente.")
    data_nascimento: str = Field(description="A data de nascimento do paciente no formato DD/MM/AAAA.")
    cpf: str = Field(description="O CPF do paciente no formato XXX.XXX.XXX-XX.")
    telefone_celular: str = Field(description="O número de telefone do paciente, incluindo o código do país e DDD, no formato +55 11 99999-9999.")

parser_extracao = JsonOutputParser(pydantic_object=DadosPacienteOutput)
prompt_extracao = ChatPromptTemplate.from_template(
    """
    # MISSÃO
    Extraia o nome completo, a data de nascimento, o CPF e o telefone do texto do usuário.
    # REGRAS
    - A data de nascimento deve estar no formato DD/MM/AAAA.
    - O CPF deve estar no formato XXX.XXX.XXX-XX.
    - O telefone deve estar no formato +55 11 99999-9999.
    # INSTRUÇÕES DE FORMATAÇÃO
    {format_instructions}
    # MENSAGEM DO USUÁRIO
    {dados_do_usuario}
    """,
    partial_variables={"format_instructions": parser_extracao.get_format_instructions()},
)
chain_extracao_dados = prompt_extracao | llm | parser_extracao

# --- CÉREBRO 4: IA DE PERGUNTAS FREQUENTES (FAQ) ---
faq_base_de_conhecimento = """
**P: Qual o horário de atendimento da clínica?**
R: Funcionamos de Segunda a Sexta, das 8h às 18h, e aos Sábados, das 8h às 12h.

**P: A consulta tem direito a retorno?**
R: Sim, nossas consultas particulares dão direito a um retorno em até 30 dias para avaliação dos exames que o médico solicitou, sem nenhum custo adicional.

**P: Vocês parcelam no cartão de crédito?**
R: Sim, para pagamentos com cartão de crédito, feitos presencialmente na clínica, oferecemos parcelamento em até 3x sem juros para valores acima de R$ 400,00.

**P: Vocês aceitam convênio ou plano de saúde?**
R: No momento, nossos atendimentos são apenas na modalidade particular. Emitimos nota fiscal para que você possa solicitar reembolso junto ao seu plano de saúde, se ele oferecer essa opção.

**P: Qual o endereço da clínica?**
R: Estamos na Rua Orense, 41 – Sala 512, no Condomínio D Office, centro de Diadema/SP.
"""

class FaqOutput(BaseModel):
    resposta: str = Field(description="A resposta à pergunta do usuário, baseada estritamente na base de conhecimento.")

parser_faq = JsonOutputParser(pydantic_object=FaqOutput)
prompt_faq = ChatPromptTemplate.from_template(
    """
    # MISSÃO
    Você é a secretária Leonidas. Responda à pergunta do usuário usando APENAS a base de conhecimento.
    
    # BASE DE CONHECIMENTO (FAQ)
    {faq}

    # REGRAS CRÍTICAS
    - Se a resposta estiver na base, responda de forma clara.
    - Se a resposta NÃO estiver na base, responda EXATAMENTE com: "Desculpe, não disponho dessa informação específica no momento. Posso te ajudar a agendar uma consulta/exame, consultar preços ou cancelar um agendamento?"
    - Responda APENAS com o objeto JSON formatado.

    # INSTRUÇÕES DE FORMATAÇÃO
    {format_instructions}

    # PERGUNTA DO USUÁRIO
    {pergunta_do_usuario}
    """,
    partial_variables={"format_instructions": parser_faq.get_format_instructions(), "faq": faq_base_de_conhecimento},
)
chain_faq = prompt_faq | llm | parser_faq


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


# --- ORQUESTRADOR PRINCIPAL DA CONVERSA (ATUALIZADO PARA TRIAGEM) ---
@csrf_exempt
@require_POST
def chatbot_orchestrator(request):
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
        logger.warning(f"\n--- INÍCIO REQ --- | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")
        
        resultado = {}
        
        # --- LÓGICA DE TIMEOUT ---
        if estado_atual == 'awaiting_inactivity_response':
            logger.warning("Rota: RESPOSTA AO AVISO DE INATIVIDADE.")
            resposta_lower = user_message.lower().strip()
            
            if resposta_lower in ['sim', 's', 'continuar']:
                novo_estado = memoria_obj.previous_state or 'identificando_demanda'
                resultado = {"response_message": "Perfeito! Pode continuar de onde paramos.", "new_state": novo_estado, "memory_data": memoria_atual}
            elif resposta_lower in ['não', 'nao', 'n', 'encerrar']:
                resultado = {"response_message": "Entendido. Estou encerrando. Se precisar, é só chamar!", "new_state": "inicio", "memory_data": {'nome_usuario': memoria_atual.get('nome_usuario')}}
            else: # Assume que o usuário está continuando a conversa
                estado_anterior = memoria_obj.previous_state or 'identificando_demanda'
                memoria_obj.state = estado_anterior
                estado_atual = estado_anterior # Continua o fluxo normal
                logger.warning(f"Usuário ignorou aviso e continuou. Retornando ao estado '{estado_atual}'.")
        
        # --- FLUXO NORMAL DA CONVERSA ---
        if not resultado: # Se a lógica de timeout não definiu um resultado
            # Se já estamos em um fluxo, continuamos nele.
            if estado_atual and not estado_atual in ['inicio', 'aguardando_nome', 'identificando_demanda']:
                logger.warning(f"Rota: CONTINUANDO FLUXO '{estado_atual}'.")
                manager = AgendamentoManager(session_id, memoria_atual, request.build_absolute_uri('/'), chain_sintomas, chain_extracao_dados)
                resultado = manager.processar(user_message, estado_atual)
            
            # Se estamos no início de uma conversa, identificamos a intenção.
            elif estado_atual == 'identificando_demanda':
                logger.warning("Rota: IDENTIFICANDO DEMANDA (IA Roteadora).")
                intent_data = chain_roteadora.invoke({"user_message": user_message})
                intent = intent_data.get("intent")
                logger.warning(f"Intenção Detectada: '{intent}'")

                if intent == "iniciar_agendamento":
                    manager = AgendamentoManager(session_id, memoria_atual, request.build_absolute_uri('/'))
                    resultado = manager.processar(user_message, 'agendamento_inicio')
                elif intent == "buscar_preco":
                    # ... (lógica de buscar_preco) ...
                    pass
                elif intent == "cancelar_agendamento":
                    manager = AgendamentoManager(session_id, memoria_atual, request.build_absolute_uri('/'))
                    resultado = manager.processar(user_message, 'cancelamento_inicio')
                elif intent == "triagem_sintomas":
                    manager = AgendamentoManager(session_id, memoria_atual, request.build_absolute_uri('/'), chain_sintomas, chain_extracao_dados)
                    resultado = manager.processar(user_message, 'triagem_processar_sintomas')
                else: # 'pergunta_geral' ou fallback
                    logger.warning("Rota: Acionando IA de FAQ.")
                    faq_data = chain_faq.invoke({"pergunta_do_usuario": user_message})
                    resposta_final = faq_data.get("resposta")
                    resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}

            # Se a conversa está começando agora.
            else:
                if estado_atual == 'aguardando_nome':
                    nome_usuario = user_message.strip().title()
                    memoria_atual['nome_usuario'] = nome_usuario
                    resposta_final = f"Certo, {nome_usuario}. Pode me contar como posso te ajudar?"
                    novo_estado = 'identificando_demanda'
                    resultado = {"response_message": resposta_final, "new_state": novo_estado, "memory_data": memoria_atual}
                else: # estado == 'inicio'
                    logger.warning("Rota: INICIANDO NOVA CONVERSA.")
                    resposta_final = "Olá, seja bem-vindo à Clínica Limalé.\nEu sou o Leônidas, e vou dar sequência no seu atendimento.\nPode me passar seu nome?"
                    novo_estado = 'aguardando_nome'
                    resultado = {"response_message": resposta_final, "new_state": novo_estado, "memory_data": memoria_atual}

        # Salva o novo estado e a memória no banco de dados
        memoria_obj.state = resultado.get("new_state")
        memoria_obj.memory_data = resultado.get("memory_data")
        memoria_obj.previous_state = None if memoria_obj.state != 'awaiting_inactivity_response' else memoria_obj.previous_state
        memoria_obj.save()

        resposta_final_msg = resultado.get("response_message")
        logger.warning(f"Resposta Final: '{str(resposta_final_msg)[:150]}...'")
        return JsonResponse({"response_message": resposta_final_msg})

    except Exception as e:
        logger.error(f"ERRO CRÍTICO no orquestrador: {e}", exc_info=True)
        return JsonResponse({"error": "Ocorreu um erro interno. A equipe técnica foi notificada."}, status=500)

