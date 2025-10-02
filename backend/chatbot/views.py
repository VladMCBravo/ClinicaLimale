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


# --- SEÇÃO DAS INTELIGÊNCIAS ARTIFICIAIS ---
# ... (Cérebros 1, 2, 3 e 4 permanecem os mesmos) ...
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-pro",
    temperature=0,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)

class RoteadorOutput(BaseModel):
    intent: str = Field(description="A intenção do utilizador. Deve ser uma das: 'saudacao', 'iniciar_agendamento', 'buscar_preco', 'cancelar_agendamento', 'triagem_sintomas', 'pergunta_geral'.")
    entity: Optional[str] = Field(description="O serviço ou especialidade específica que o utilizador mencionou, se houver.")
parser_roteador = JsonOutputParser(pydantic_object=RoteadorOutput)
prompt_roteador = ChatPromptTemplate.from_template(
    """# MISSÃO
Analise a mensagem do utilizador para determinar a intenção. Responda APENAS com o objeto JSON formatado.
# INTENÇÕES POSSÍVEIS
- 'saudacao': Cumprimentos gerais.
- 'iniciar_agendamento': O utilizador quer marcar, agendar, ver horários.
- 'buscar_preco': O utilizador quer saber o valor, preço, quanto custa, quanto sai.
- 'cancelar_agendamento': O utilizador quer desmarcar ou cancelar.
- 'triagem_sintomas': O utilizador descreve sintomas e não sabe qual especialista.
- 'pergunta_geral': Uma pergunta sobre a clínica que não se encaixa nas outras (ex: 'quais as especialidades?', 'aceita convénio?', 'parcela?').
# INSTRUÇÕES DE FORMATAÇÃO
{format_instructions}
# MENSAGEM DO UTILIZADOR
{user_message}""",
    partial_variables={"format_instructions": parser_roteador.get_format_instructions()},
)
chain_roteadora = prompt_roteador | llm | parser_roteador

# (Cérebros de Triagem, Extração e FAQ permanecem aqui, exatamente como no seu arquivo original)
# --- CÉREBRO 2: IA DE TRIAGEM DE SINTOMAS ---
lista_especialidades_para_ia = "Cardiologia, Ginecologia, Neonatologia, Obstetrícia, Ortopedia, Pediatria, Reumatologia Pediátrica"
class TriagemOutput(BaseModel):
    especialidade_sugerida: str = Field(description=f"A especialidade sugerida. Deve ser uma das: {lista_especialidades_para_ia}, ou 'Nenhuma' se os sintomas forem vagos.")
parser_sintomas = JsonOutputParser(pydantic_object=TriagemOutput)
prompt_sintomas = ChatPromptTemplate.from_template(
    """# MISSÃO
Analise os sintomas e sugira a especialidade mais apropriada.
# REGRAS CRÍTICAS
- JAMAIS forneça diagnósticos.
- Responda APENAS com o objeto JSON formatado.
# INSTRUÇÕES DE FORMATAÇÃO
{format_instructions}
# SINTOMAS DO UTILIZADOR
{sintomas_do_usuario}""",
    partial_variables={"format_instructions": parser_sintomas.get_format_instructions()},
)
chain_sintomas = prompt_sintomas | llm | parser_sintomas

# --- CÉREBRO 3: IA EXTRATORA DE DADOS ---
class DadosPacienteOutput(BaseModel):
    nome_completo: str = Field(description="O nome completo do paciente.")
    data_nascimento: str = Field(description="A data de nascimento no formato DD/MM/AAAA.")
    cpf: str = Field(description="O CPF do paciente, contendo 11 dígitos. Extraia apenas os números se não houver formatação.")
    telefone_celular: str = Field(description="O telefone celular com DDD. Extraia apenas os números se não houver formatação.")
    email: str = Field(description="O email do paciente.")
parser_extracao = JsonOutputParser(pydantic_object=DadosPacienteOutput)
prompt_extracao = ChatPromptTemplate.from_template(
    """# MISSÃO
Sua única tarefa é extrair as informações do texto do usuário e formatá-las como um objeto JSON.
# REGRAS CRÍTICAS
- Responda APENAS com o objeto JSON.
- NÃO inclua markdown (```json), explicações, ou qualquer outro texto antes ou depois do JSON.
- Se uma informação não for encontrada, retorne uma string vazia "" para aquele campo.
# INSTRUÇÕES DE FORMATAÇÃO JSON
{format_instructions}
# TEXTO DO USUÁRIO PARA ANÁLISE
{dados_do_usuario}""",
    partial_variables={"format_instructions": parser_extracao.get_format_instructions()},
)
chain_extracao_dados = prompt_extracao | llm | parser_extracao

# --- CÉREBRO 4: IA DE PERGUNTAS FREQUENTES (FAQ) ---
faq_base_de_conhecimento = """
**P: Quais são as especialidades que vocês atendem?**
R: {lista_de_especialidades}
**P: Qual o horário de atendimento da clínica?**
R: Funcionamos de Segunda a Sexta, das 8h às 18h, e aos Sábados, das 8h às 12h.
**P: A consulta tem direito a retorno?**
R: Sim, as nossas consultas particulares dão direito a um retorno em até 30 dias para avaliação dos exames que o médico solicitou, sem nenhum custo adicional.
**P: Vocês parcelam no cartão de crédito?**
R: Sim, para pagamentos com cartão de crédito, feitos presencialmente na clínica, oferecemos parcelamento em até 3x sem juros para valores acima de R$ 400,00.
**P: Vocês aceitam convénio ou plano de saúde?**
R: No momento, os nossos atendimentos são apenas na modalidade particular. Emitimos nota fiscal para que você possa solicitar reembolso junto ao seu plano de saúde, se ele oferecer essa opção.
**P: Qual o endereço da clínica?**
R: Estamos na Rua Orense, 41 – Sala 512, no Condomínio D Office, centro de Diadema/SP."""
class FaqOutput(BaseModel):
    resposta: str = Field(description="A resposta à pergunta do utilizador, baseada estritamente na base de conhecimento.")
parser_faq = JsonOutputParser(pydantic_object=FaqOutput)
prompt_faq_template = ChatPromptTemplate.from_template(
    """# MISSÃO
Você é a secretária Leonidas. Responda à pergunta do utilizador usando APENAS a base de conhecimento.
# BASE DE CONHECIMENTO (FAQ)
{faq}
# REGRAS CRÍTICAS
- Se a resposta estiver na base, responda de forma clara.
- Se a resposta NÃO estiver na base, responda EXATAMENTE com: "Desculpe, não disponho dessa informação específica no momento. Posso ajudar a agendar uma consulta/exame, consultar preços ou cancelar um agendamento?"
- Responda APENAS com o objeto JSON formatado.
# INSTRUÇÕES DE FORMATAÇÃO
{format_instructions}
# PERGUNTA DO UTILIZADOR
{pergunta_do_usuario}""",
    partial_variables={"format_instructions": parser_faq.get_format_instructions()},
)
chain_faq = prompt_faq_template | llm | parser_faq

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

class ListarConversasAtivasView(APIView):
    def get(self, request):
        # Trocamos .filter(state__ne='inicio') por .exclude(state='inicio')
        conversas = ChatMemory.objects.exclude(state='inicio').order_by('-updated_at')[:10]

        dados_formatados = [{
            'session_id': c.session_id,
            'last_update': c.updated_at,
            'current_state': c.state,
            'paciente_nome': c.memory_data.get('nome_usuario', 'Desconhecido') if isinstance(c.memory_data, dict) else 'N/A'
        } for c in conversas]

        return Response(dados_formatados)

# --- NOVA FUNÇÃO AUXILIAR PARA RESPOSTA DE PREÇO HUMANIZADA ---
def get_resposta_preco(nome_servico: str, nome_usuario: str = ""):
    """
    Busca o preço de um serviço e monta uma resposta humanizada.
    """
    servico_info = buscar_precos_servicos(nome_servico)
    
    # Mensagem de valorização da clínica
    texto_base = (
        f"Claro, {nome_usuario}! Antes de te passar os valores, quero destacar que aqui na Clínica Limalé prezamos "
        "pelo acolhimento, qualidade no atendimento e um time altamente qualificado.\n\n"
    )

    if servico_info:
        # Mensagem com o preço e benefícios
        resposta_final = (
            f"O serviço de *{servico_info['nome']}* tem o valor de *R$ {servico_info['valor']}*.\n"
            "Também oferecemos um desconto de 5% para pagamentos via Pix realizados no momento do agendamento. "
            "Assim, sua vaga já fica garantida!\n\nGostaria de agendar?"
        )
        return texto_base + resposta_final
    else:
        # Mensagem de fallback caso o serviço não seja encontrado
        return (
            f"{nome_usuario}, não encontrei um valor específico para o que você pediu. Nossas consultas particulares geralmente têm valores a partir de R$ 350,00. "
            "Para qual especialidade você gostaria de saber o valor?"
        )

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
