# chatbot/chains.py

import os
import logging
from typing import Optional
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.runnables import Runnable

logger = logging.getLogger(__name__)

# --- CONFIGURAÇÃO E INICIALIZAÇÃO SEGURA DO "CÉREBRO" DE IA ---

llm = None
chain_roteadora: Optional[Runnable] = None
chain_sintomas: Optional[Runnable] = None
chain_extracao_dados: Optional[Runnable] = None
chain_faq: Optional[Runnable] = None

try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        # Lança um erro claro se a chave não estiver no ambiente
        raise ValueError("A variável de ambiente GOOGLE_API_KEY não foi encontrada.")

    # Inicializa o modelo de linguagem
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-pro", temperature=0, google_api_key=api_key)
    logger.info("LLM (Gemini) inicializado com sucesso.")

    # --- CÉREBRO 1: IA ROTEADORA DE INTENÇÕES ---
    class RoteadorOutput(BaseModel):
        intent: str = Field(description="A intenção do usuário. Deve ser uma das: 'saudacao', 'iniciar_agendamento', 'buscar_preco', 'cancelar_agendamento', 'triagem_sintomas', 'pergunta_geral'.")
        entity: Optional[str] = Field(description="O serviço ou especialidade específica que o usuário mencionou, se houver.")
    parser_roteador = JsonOutputParser(pydantic_object=RoteadorOutput)
    prompt_roteador = ChatPromptTemplate.from_template(
        """# MISSÃO
        Analise a mensagem do usuário e determine sua intenção principal. Você é o primeiro ponto de contato e precisa rotear a conversa para o fluxo correto.
        # REGRAS
        - Se o usuário cumprimenta ('oi', 'olá', 'bom dia'), a intenção é 'saudacao'.
        - Se o usuário quer marcar algo ('agendar', 'marcar consulta', 'ver horário'), a intenção é 'iniciar_agendamento'.
        - Se o usuário pergunta sobre valores ('preço', 'quanto custa', 'valor'), a intenção é 'buscar_preco'.
        - Se o usuário quer desmarcar ('cancelar', 'não posso ir', 'desmarcar'), a intenção é 'cancelar_agendamento'.
        - Se o usuário descreve um mal-estar ('estou com dor', 'sentindo febre'), a intenção é 'triagem_sintomas'.
        - Para qualquer outra pergunta (horário de funcionamento, endereço, convênios), a intenção é 'pergunta_geral'.
        - Se uma entidade (ex: 'Cardiologia', 'Ultrassom') for mencionada, extraia-a.
        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}
        # MENSAGEM DO USUÁRIO
        {user_message}""",
        partial_variables={"format_instructions": parser_roteador.get_format_instructions()},
    )
    chain_roteadora = prompt_roteador | llm | parser_roteador

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
        # SINTOMAS DO USUÁRIO
        {sintomas_do_usuario}""",
        partial_variables={"format_instructions": parser_sintomas.get_format_instructions()},
    )
    chain_sintomas = prompt_sintomas | llm | parser_sintomas

    # --- CÉREBRO 3: IA EXTRATORA DE DADOS ---
    class DadosPacienteOutput(BaseModel):
        nome_completo: str = Field(description="O nome completo do paciente.")
        data_nascimento: str = Field(description="A data de nascimento no formato DD/MM/AAAA.")
        cpf: str = Field(description="O CPF do paciente, contendo 11 dígitos. Extraia apenas os números.")
        telefone_celular: str = Field(description="O telefone celular com DDD. Extraia apenas os números.")
        email: str = Field(description="O email do paciente.")
    parser_extracao = JsonOutputParser(pydantic_object=DadosPacienteOutput)
    prompt_extracao = ChatPromptTemplate.from_template(
        """# MISSÃO
        Sua única tarefa é extrair as informações do texto do usuário e formatá-las como um objeto JSON.
        # REGRAS CRÍTICAS
        - Responda APENAS com o objeto JSON.
        - NÃO inclua markdown (```json), explicações, ou qualquer outro texto.
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
    **P: Vocês aceitam convênio ou plano de saúde?**
    R: No momento, os nossos atendimentos são apenas na modalidade particular. Emitimos nota fiscal para que você possa solicitar reembolso junto ao seu plano de saúde, se ele oferecer essa opção.
    **P: Qual o endereço da clínica?**
    R: Estamos na Rua Orense, 41 – Sala 512, no Condomínio D Office, centro de Diadema/SP."""
    class FaqOutput(BaseModel):
        resposta: str = Field(description="A resposta à pergunta do usuário, baseada estritamente na base de conhecimento.")
    parser_faq = JsonOutputParser(pydantic_object=FaqOutput)
    prompt_faq_template = ChatPromptTemplate.from_template(
        """# MISSÃO
        Você é a secretária Leonidas. Responda à pergunta do usuário usando APENAS a base de conhecimento.
        # BASE DE CONHECIMENTO (FAQ)
        {faq}
        # REGRAS CRÍTICAS
        - Se a resposta estiver na base, responda de forma clara.
        - Se a resposta NÃO estiver na base, responda EXATAMENTE com: "Desculpe, não disponho dessa informação específica no momento. Posso ajudar a agendar uma consulta/exame, consultar preços ou cancelar um agendamento?"
        - Responda APENAS com o objeto JSON formatado.
        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}
        # PERGUNTA DO USUÁRIO
        {pergunta_do_usuario}""",
        partial_variables={"format_instructions": parser_faq.get_format_instructions()},
    )
    chain_faq = prompt_faq_template | llm | parser_faq


except Exception as e:
    # Se qualquer parte da inicialização falhar, loga um erro crítico.
    # As chains permanecerão como None, e o bot_logic saberá lidar com isso.
    logger.critical(f"FALHA CRÍTICA AO INICIALIZAR AS CHAINS DE IA: {e}", exc_info=True)