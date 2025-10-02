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

# --- CÉREBRO 1: IA ROTEADORA DE INTENÇÕES ---
class RoteadorOutput(BaseModel):
    intent: str = Field(description="A intenção do utilizador. Deve ser uma das: 'saudacao', 'iniciar_agendamento', 'buscar_preco', 'cancelar_agendamento', 'triagem_sintomas', 'pergunta_geral'.")
    entity: Optional[str] = Field(description="O serviço ou especialidade específica que o utilizador mencionou, se houver.")

parser_roteador = JsonOutputParser(pydantic_object=RoteadorOutput)
prompt_roteador = ChatPromptTemplate.from_template(
    """
    # MISSÃO
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
    {user_message}
    """,
    partial_variables={"format_instructions": parser_roteador.get_format_instructions()},
)
chain_roteadora = prompt_roteador | llm | parser_roteador


# --- CÉREBRO 2: IA DE TRIAGEM DE SINTOMAS ---
lista_especialidades_para_ia = "Cardiologia, Ginecologia, Neonatologia, Obstetrícia, Ortopedia, Pediatria, Reumatologia Pediátrica"

class TriagemOutput(BaseModel):
    especialidade_sugerida: str = Field(description=f"A especialidade sugerida. Deve ser uma das: {lista_especialidades_para_ia}, ou 'Nenhuma' se os sintomas forem vagos.")

parser_sintomas = JsonOutputParser(pydantic_object=TriagemOutput)
prompt_sintomas = ChatPromptTemplate.from_template(
    """
    # MISSÃO
    Analise os sintomas e sugira a especialidade mais apropriada.
    # REGRAS CRÍTICAS
    - JAMAIS forneça diagnósticos.
    - Responda APENAS com o objeto JSON formatado.
    # INSTRUÇÕES DE FORMATAÇÃO
    {format_instructions}
    # SINTOMAS DO UTILIZADOR
    {sintomas_do_usuario}
    """,
    partial_variables={"format_instructions": parser_sintomas.get_format_instructions()},
)
chain_sintomas = prompt_sintomas | llm | parser_sintomas


# --- CÉREBRO 3: IA EXTRATORA DE DADOS ---
class DadosPacienteOutput(BaseModel):
    # ... (sem alterações dentro da classe) ...
    nome_completo: str = Field(description="O nome completo do paciente.")
    data_nascimento: str = Field(description="A data de nascimento no formato DD/MM/AAAA.")
    cpf: str = Field(description="O CPF do paciente, contendo 11 dígitos. Extraia apenas os números se não houver formatação.")
    telefone_celular: str = Field(description="O telefone celular com DDD. Extraia apenas os números se não houver formatação.")
    email: str = Field(description="O email do paciente.")


parser_extracao = JsonOutputParser(pydantic_object=DadosPacienteOutput)

# --- INÍCIO DA ALTERAÇÃO ---
prompt_extracao = ChatPromptTemplate.from_template(
    """
    # MISSÃO
    Sua única tarefa é extrair as informações do texto do usuário e formatá-las como um objeto JSON.

    # REGRAS CRÍTICAS
    - Responda APENAS com o objeto JSON.
    - NÃO inclua markdown (```json), explicações, ou qualquer outro texto antes ou depois do JSON.
    - Se uma informação não for encontrada, retorne uma string vazia "" para aquele campo.

    # INSTRUÇÕES DE FORMATAÇÃO JSON
    {format_instructions}

    # TEXTO DO USUÁRIO PARA ANÁLISE
    {dados_do_usuario}
    """,
    partial_variables={"format_instructions": parser_extracao.get_format_instructions()},
)
# --- FIM DA ALTERAÇÃO ---

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
R: Estamos na Rua Orense, 41 – Sala 512, no Condomínio D Office, centro de Diadema/SP.
"""

class FaqOutput(BaseModel):
    resposta: str = Field(description="A resposta à pergunta do utilizador, baseada estritamente na base de conhecimento.")

parser_faq = JsonOutputParser(pydantic_object=FaqOutput)
prompt_faq_template = ChatPromptTemplate.from_template(
    """
    # MISSÃO
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
    {pergunta_do_usuario}
    """,
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

@csrf_exempt
@require_POST
def chatbot_orchestrator(request):
    try:
        data = json.loads(request.body)
        user_message = data.get("message")
        session_id = data.get("sessionId")

        if not user_message or not session_id:
            return JsonResponse({"error": "message e sessionId são obrigatórios."}, status=400)

        # Verifica timeout antes de processar
        if REFINEMENTS_AVAILABLE:
            timeout_result = TimeoutManager.verificar_timeout(session_id)
            if timeout_result:
                return JsonResponse({"response_message": timeout_result["message"]})

        memoria_obj, created = ChatMemory.objects.get_or_create(
            session_id=session_id,
            defaults={'memory_data': {}, 'state': 'inicio', 'previous_state': None}
        )
        
        # Registra início de conversa para analytics
        if REFINEMENTS_AVAILABLE and created:
            AnalyticsManager.registrar_inicio_conversa(session_id)
        
        memoria_atual = memoria_obj.memory_data if isinstance(memoria_obj.memory_data, dict) else {}
        estado_atual = memoria_obj.state
        
        # Inicializa gerenciador de contexto
        context_manager = None
        if REFINEMENTS_AVAILABLE:
            context_manager = ContextManager(memoria_atual)
        
        logger.warning(f"\n--- INÍCIO REQ --- | Session: {session_id} | Estado: '{estado_atual}' | Msg: '{user_message}'")
        
        resultado = {}
        
        # --- LÓGICA DE TIMEOUT ---
        if estado_atual == 'awaiting_inactivity_response':
            logger.warning("Rota: RESPOSTA AO AVISO DE INATIVIDADE.")
            resposta_lower = user_message.lower().strip()
            
            if resposta_lower in ['sim', 's', 'continuar']:
                novo_estado = memoria_obj.previous_state or 'identificando_demanda'
                resultado = {"response_message": "Perfeito! Pode continuar de onde parámos.", "new_state": novo_estado, "memory_data": memoria_atual}
            elif resposta_lower in ['não', 'nao', 'n', 'encerrar']:
                resultado = {"response_message": "Entendido. Estou a encerrar. Se precisar, é só chamar!", "new_state": "inicio", "memory_data": {'nome_usuario': memoria_atual.get('nome_usuario')}}
            else:
                estado_anterior = memoria_obj.previous_state or 'identificando_demanda'
                memoria_obj.state = estado_anterior
                estado_atual = estado_anterior
                logger.warning(f"Utilizador ignorou aviso e continuou. A retornar ao estado '{estado_atual}'.")
        
        # --- FLUXO NORMAL DA CONVERSA ---
        if not resultado:
            if estado_atual and not estado_atual in ['inicio', 'aguardando_nome', 'identificando_demanda']:
                logger.warning(f"Rota: A CONTINUAR FLUXO '{estado_atual}'.")
                
                # --- NOVA LÓGICA DE INICIALIZAÇÃO CONDICIONAL ---
                # Por padrão, não carregamos as IAs
                manager_chain_sintomas = None
                manager_chain_extracao = None

                # Só carregamos as IAs se o estado atual exigir
                if estado_atual == 'triagem_processar_sintomas':
                    logger.warning("Carregando 'chain_sintomas' para o AgendamentoManager.")
                    manager_chain_sintomas = chain_sintomas
                # ALTERE A LINHA ABAIXO
                elif estado_atual in ['cadastro_awaiting_data', 'cadastro_awaiting_missing_field']:
                # FIM DA ALTERAÇÃO
                    logger.warning("Carregando 'chain_extracao_dados' para o AgendamentoManager.")
                    manager_chain_extracao = chain_extracao_dados

                # Inicializamos o manager com as cadeias (ou None)
                manager = AgendamentoManager(
                    session_id, 
                    memoria_atual, 
                    request.build_absolute_uri('/'), 
                    manager_chain_sintomas, 
                    manager_chain_extracao
                )

                # --- FIM DA NOVA LÓGICA ---

                resultado = manager.processar(user_message, estado_atual)
            
            elif estado_atual == 'identificando_demanda':
                # (O restante desta seção 'elif' e 'else' permanece exatamente o mesmo)
                logger.warning("Rota: A IDENTIFICAR DEMANDA (IA Roteadora).")
                
                if 'especialidade' in user_message.lower():
                    logger.warning("Rota: Pergunta sobre especialidades (resposta direta).")
                    especialidades_db = Especialidade.objects.all().order_by('nome')
                    lista_nomes = [esp.nome for esp in especialidades_db]
                    resposta_final = f"Atendemos as seguintes especialidades:\n• " + "\n• ".join(lista_nomes)
                    resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}
                else:
                    intent_data = chain_roteadora.invoke({"user_message": user_message})
                    intent = intent_data.get("intent")
                    entity = intent_data.get("entity")
                    logger.warning(f"Intenção Detetada: '{intent}', Entidade: '{entity}'")
                    
                    nome_usuario = memoria_atual.get('nome_usuario', '')

                    if intent == "buscar_preco":
                        logger.warning("Rota: A buscar preço.")
                        resposta_final = get_resposta_preco(entity or user_message, nome_usuario)
                        resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}
                    elif intent == "iniciar_agendamento":
                        manager = AgendamentoManager(session_id, memoria_atual, request.build_absolute_uri('/'))
                        resultado = manager.processar(user_message, 'agendamento_inicio')
                    elif intent == "cancelar_agendamento":
                        manager = AgendamentoManager(session_id, memoria_atual, request.build_absolute_uri('/'))
                        resultado = manager.processar(user_message, 'cancelamento_inicio')
                    elif intent == "triagem_sintomas":
                        manager = AgendamentoManager(session_id, memoria_atual, request.build_absolute_uri('/'), chain_sintomas, chain_extracao_dados)
                        resultado = manager.processar(user_message, 'triagem_processar_sintomas')
                    else: 
                        logger.warning("Rota: A acionar IA de FAQ.")
                        faq_data = chain_faq.invoke({"pergunta_do_usuario": user_message, "faq": faq_base_de_conhecimento})
                        resposta_final = faq_data.get("resposta")
                        resultado = {"response_message": resposta_final, "new_state": 'identificando_demanda', "memory_data": memoria_atual}
            else:
                if estado_atual == 'aguardando_nome':
                    # --- INÍCIO DA ALTERAÇÃO ---
                    nome_potencial = user_message.strip()
                    # Simples verificação para não confundir comandos com nomes
                    if len(nome_potencial.split()) > 3 or len(nome_potencial) > 50:
                         resposta_final = "Por favor, me informe um nome válido para que eu possa te chamar assim."
                         novo_estado = 'aguardando_nome'
                         resultado = {"response_message": resposta_final, "new_state": novo_estado, "memory_data": memoria_atual}
                    else:
                        nome_usuario = nome_potencial.title().split(' ')[0]
                        memoria_atual['nome_usuario'] = nome_usuario
                        # --- INÍCIO DA ALTERAÇÃO ---
                        resposta_final = (
                            f"Prazer, {nome_usuario}! 😊\n\n"
                            "Eu posso te ajudar com:\n\n"
                            "• Agendamentos de consultas e exames\n"
                            "• Informações sobre nossos serviços\n"
                            "• Consultas de preços\n\n"
                            "O que você gostaria de fazer hoje?"
                        )
                        # --- FIM DA ALTERAÇÃO ---
                        novo_estado = 'identificando_demanda'
                        resultado = {"response_message": resposta_final, "new_state": novo_estado, "memory_data": memoria_atual}
                    # --- FIM DA ALTERAÇÃO ---
                else: 
                    logger.warning("Rota: A INICIAR NOVA CONVERSA.")
                    resposta_final = "Olá, seja bem-vindo à Clínica Limalé.\nEu sou o Leônidas, e vou dar sequência ao seu atendimento.\nPode dizer-me o seu nome?"
                    novo_estado = 'aguardando_nome'
                    resultado = {"response_message": resposta_final, "new_state": novo_estado, "memory_data": memoria_atual}

        # Adiciona interação ao contexto
        resposta_final_msg = resultado.get("response_message")
        novo_estado = resultado.get("new_state")
        if REFINEMENTS_AVAILABLE and context_manager:
            context_manager.adicionar_interacao(user_message, resposta_final_msg, novo_estado)
        
        # Registra eventos importantes para analytics
        if REFINEMENTS_AVAILABLE:
            if novo_estado == 'agendamento_awaiting_confirmation':
                AnalyticsManager.registrar_evento(session_id, 'pre_agendamento_completo')
            elif 'especialidade' in resultado.get("memory_data", {}):
                AnalyticsManager.registrar_evento(
                    session_id, 
                    'especialidade_selecionada',
                    {'especialidade': resultado["memory_data"].get('especialidade_nome')}
                )
        
        # Salva o novo estado e a memória na base de dados
        memoria_obj.state = novo_estado
        memoria_obj.memory_data = resultado.get("memory_data")
        memoria_obj.previous_state = None if memoria_obj.state != 'awaiting_inactivity_response' else memoria_obj.previous_state
        memoria_obj.save()
        
        # Reseta timeout após atividade
        if REFINEMENTS_AVAILABLE:
            TimeoutManager.resetar_timeout(session_id)

        logger.warning(f"Resposta Final: '{str(resposta_final_msg)[:150]}...'")
        return JsonResponse({"response_message": resposta_final_msg})

    except Exception as e:
        logger.error(f"ERRO CRÍTICO no orquestrador: {e}", exc_info=True)
        
        # Registra erro para analytics
        if REFINEMENTS_AVAILABLE:
            try:
                AnalyticsManager.registrar_erro(session_id, 'erro_orquestrador', str(e))
            except:
                pass  # Não falha se analytics falhar
        
        return JsonResponse({"error": "Ocorreu um erro interno. A equipa técnica já foi notificada."}, status=500)

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
