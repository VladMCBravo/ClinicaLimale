# Em chatbot/chains.py

import os
import logging
from typing import Optional, Literal
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.runnables import Runnable

logger = logging.getLogger(__name__)

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

llm = None
chain_faq: Optional[Runnable] = None
chain_recepcionista: Optional[Runnable] = None

try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("A variável de ambiente GOOGLE_API_KEY não foi encontrada.")

        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0, google_api_key=api_key)

    class RecepcionistaOutput(BaseModel):
        nome_extraido: Optional[str] = Field(description="O nome do paciente, SE ele tiver se apresentado. Caso contrário, retorne null.")
        procedimento_especialidade: Optional[str] = Field(description="Se o paciente já informou O NOME do exame (ex: Eletrocardiograma) ou especialidade médica, extraia aqui. Senão, null.")
        intencao: Literal['exame_geral', 'exame_fetal', 'consulta', 'informacao_geral', 'humano', 'cancelamento'] = Field(description="A intenção deduzida da mensagem.")
        resposta_humanizada: str = Field(description="A resposta completa pronta para ser enviada.")

    parser_recepcionista = JsonOutputParser(pydantic_object=RecepcionistaOutput)
    prompt_recepcionista = ChatPromptTemplate.from_template(
        """# MISSÃO
        Você é Leônidas, o assistente da Clínica Limalé.
        Interprete a mensagem, classifique a intenção e responda conforme as regras estritas abaixo.

        # CONTEXTO
        - Nome do paciente conhecido: "{nome_conhecido}"
        - Mensagem: "{user_message}"
        - Pular Saudação: "{pular_saudacao}"

        # REGRAS DE ROTEAMENTO (ATENÇÃO ÀS PALAVRAS-CHAVE E NÚMEROS)
        1. Intenção 'exame_fetal': Se a mensagem contiver "1", "ultrassom", "morfológico", "doppler", "eco fetal", "4d", "gravidez", "gestação", "ver bebê".
        2. Intenção 'exame_geral': Se a mensagem contiver "2", "3", "ultrassonografia geral", "exames cardiológicos", "eletrocardiograma".
        3. Intenção 'consulta': Se a mensagem contiver "4", "consulta", "pediatra", "ginecologista", "médico".
        4. Intenção 'humano': Se a mensagem pedir "recepção", "humano", "atendente", "ajuda".
        5. Intenção 'cancelamento': Se pedir para "cancelar", "desmarcar".

        # REGRAS DE RESPOSTA (OBRIGATÓRIO)
        1. SE a intenção for 'exame_fetal': A SUA ÚNICA RESPOSTA DEVE SER EXATAMENTE ESTA:
           "Perfeito.\\n\\nPara te orientar melhor, me informa com quantas semanas você está hoje, por favor."
        
        2. SE a intenção for 'exame_geral' ou 'consulta': Pergunte de forma acolhedora qual o procedimento/especialidade exata a pessoa procura. Exemplo: "Perfeito. Qual exame específico você gostaria de agendar?"
        
        3. SE a intenção for 'humano': "Certo, vou transferir você para nossa recepção. Um momento."

        4. IMPORTANTE: Se "{pular_saudacao}" for "SIM", você NUNCA deve dar bom dia ou dizer seu nome. Vá direto para a resposta da regra acima.

        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}
        """,
        partial_variables={"format_instructions": parser_recepcionista.get_format_instructions()},
    )
    chain_recepcionista = prompt_recepcionista | llm | parser_recepcionista

    # Chain de FAQ mantida intacta
    class FaqOutput(BaseModel):
        resposta: str = Field(description="A resposta à pergunta do usuário.")

    parser_faq = JsonOutputParser(pydantic_object=FaqOutput)
    prompt_faq_template = ChatPromptTemplate.from_template(
        """# MISSÃO
        Você é a secretária Leonidas. Responda à pergunta usando APENAS a FAQ.
        # FAQ
        {faq}
        # NOME DO USUÁRIO
        {nome_usuario}
        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}
        # PERGUNTA DO USUÁRIO
        {pergunta_do_usuario}""",
        partial_variables={"format_instructions": parser_faq.get_format_instructions()},
    )
    chain_faq = prompt_faq_template | llm | parser_faq

except Exception as e:
    logger.critical(f"FALHA: {e}")