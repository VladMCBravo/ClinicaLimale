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

    # --- CÉREBRO 1: IA ROTEADORA DE INTENÇÕES (AGORA COM MEMÓRIA) ---
    class RoteadorOutput(BaseModel):
        intent: str = Field(description="A intenção do usuário. Deve ser uma das: 'iniciar_agendamento', 'buscar_preco', 'cancelar_agendamento', 'triagem_sintomas', 'transferencia_humano', 'encerrar_conversa', 'pergunta_geral'.")
        entity: Optional[str] = Field(description="O serviço, especialidade ou sintoma específico que o usuário mencionou, se houver (ex: 'Cardiologia', 'Ecocardiograma', 'dor de cabeça').")
    
    parser_roteador = JsonOutputParser(pydantic_object=RoteadorOutput)
    prompt_roteador = ChatPromptTemplate.from_template(
        """# MISSÃO
        Sua principal missão é analisar a MENSAGEM ATUAL do usuário e, usando o HISTÓRICO DA CONVERSA como contexto, determinar a intenção principal e a entidade.

        # HISTÓRICO DA CONVERSA (ÚLTIMAS MENSAGENS)
        {historico_conversa}
        
        # REGRAS DE ROTEAMENTO E CONTEXTO
        - Use o histórico para entender perguntas curtas. Exemplo: Se o histórico mostra que o assunto é preço, e a mensagem atual é apenas "E ginecologia?", a intenção é 'buscar_preco' e a entidade é 'Ginecologia'.
        - Se mencionar 'atendente', 'humano', 'pessoa', a intenção é SEMPRE 'transferencia_humano', ignorando o contexto anterior.
        - Se mencionar 'tchau', 'obrigado', 'valeu', a intenção é 'encerrar_conversa'.
        - Se a mensagem contiver 'preço', 'valor', 'quanto custa', a intenção é 'buscar_preco'.
        - Se descreve um mal-estar ('sinto dor', 'estou com febre'), a intenção é 'triagem_sintomas'.
        - Se quer marcar algo ('agendar', 'marcar consulta') e não pergunta o preço, a intenção é 'iniciar_agendamento'.
        - Se quer desmarcar ('cancelar', 'não posso ir'), a intenção é 'cancelar_agendamento'.
        - Para perguntas gerais (endereço, horário), a intenção é 'pergunta_geral'.

        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}

        # MENSAGEM ATUAL DO USUÁRIO (PARA ANÁLISE)
        {user_message}""",
        partial_variables={"format_instructions": parser_roteador.get_format_instructions()},
    )
    chain_roteadora = prompt_roteador | llm | parser_roteador

    # --- CÉREBRO 2: IA DE TRIAGEM DE SINTOMAS ---
    lista_especialidades_para_ia = "Cardiologia, Ginecologia, Ortopedia, Pediatria, Clínico Geral"
    class TriagemOutput(BaseModel):
        especialidade_sugerida: str = Field(description=f"A especialidade médica mais adequada. Deve ser uma das: {lista_especialidades_para_ia}, ou 'Nenhuma' se os sintomas forem muito vagos.")
    
    parser_sintomas = JsonOutputParser(pydantic_object=TriagemOutput)
    prompt_sintomas = ChatPromptTemplate.from_template(
        """# MISSÃO
        Você é um assistente de triagem. Baseado nos sintomas, sugira a especialidade médica mais provável da lista. JAMAIS dê diagnósticos.
        # REGRAS
        - Dor no peito, palpitações, pressão alta -> Cardiologia.
        - Dor de cabeça, febre, mal-estar geral -> Clínico Geral.
        - Sintomas em crianças -> Pediatria.
        - Dor nas costas, joelho, articulações -> Ortopedia.
        - Questões femininas -> Ginecologia.
        - Se não tiver certeza, sugira 'Clínico Geral'.
        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}
        # SINTOMAS DO USUÁRIO
        {sintomas_do_usuario}""",
        partial_variables={"format_instructions": parser_sintomas.get_format_instructions()},
    )
    chain_sintomas = prompt_sintomas | llm | parser_sintomas

    # --- CÉREBRO 3: IA DE PERGUNTAS FREQUENTES (COM MAIS CONHECIMENTO) ---
    faq_base_de_conhecimento = """
    **P: Qual o endereço da clínica?**
    R: Nosso endereço é Rua Orense, 41 – Sala 512, no Condomínio D Office, centro de Diadema/SP.
    **P: Qual o horário de funcionamento?**
    R: Funcionamos de Segunda a Sexta, das 8h às 18h, e aos Sábados, das 8h às 12h.
    **P: Vocês atendem adulto e criança?**
    R: Sim! Atendemos pacientes de todas as idades. Temos especialistas em Pediatria para as crianças e diversas outras especialidades para os adultos.
    **P: A consulta tem direito a retorno?**
    R: Sim, nossas consultas particulares dão direito a um retorno em até 30 dias para avaliação dos exames solicitados, sem custo adicional.
    **P: Vocês aceitam convênio?**
    R: No momento, atendemos apenas na modalidade particular. Emitimos nota fiscal para que você possa solicitar reembolso junto ao seu plano de saúde.
    **P: Qual o telefone da clínica?**
    R: Você pode entrar em contato conosco pelo mesmo número de WhatsApp que está falando agora. Para outros assuntos, o telefone da recepção é (11) XXXX-XXXX.
    """
    class FaqOutput(BaseModel):
        resposta: str = Field(description="A resposta à pergunta do usuário, baseada estritamente na base de conhecimento.")
    
    parser_faq = JsonOutputParser(pydantic_object=FaqOutput)
    prompt_faq_template = ChatPromptTemplate.from_template(
        """# MISSÃO
        Você é a secretária Leonidas. Responda à pergunta do usuário usando APENAS a base de conhecimento.
        # BASE DE CONHECIMENTO (FAQ)
        {faq}
        # REGRAS
        - Se a resposta estiver na base, responda de forma acolhedora.
        - Se a resposta NÃO estiver na base, responda EXATAMENTE com: "Desculpe, não disponho dessa informação específica. Posso te ajudar a agendar uma consulta, consultar preços ou verificar seus sintomas?"
        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}
        # PERGUNTA DO USUÁRIO
        {pergunta_do_usuario}""",
        partial_variables={"format_instructions": parser_faq.get_format_instructions()},
    )
    chain_faq = prompt_faq_template | llm | parser_faq

except Exception as e:
    logger.critical(f"FALHA CRÍTICA AO INICIALIZAR AS CHAINS DE IA: {e}", exc_info=True)