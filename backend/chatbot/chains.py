# Em chatbot/chains.py (VERSÃO CORRIGIDA FINAL)

import os
import logging
from typing import Optional, Literal
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.runnables import Runnable

logger = logging.getLogger(__name__)

# --- DEFINIÇÃO DA BASE DE CONHECIMENTO ---
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
# --- FIM DA DEFINIÇÃO ---

# --- DECLARAÇÃO DAS VARIÁVEIS DE CHAIN ---
llm = None
chain_faq: Optional[Runnable] = None
chain_recepcionista: Optional[Runnable] = None # <-- ADICIONE ESTA LINHA

# --- BLOCO TRY...EXCEPT ÚNICO PARA INICIALIZAÇÃO ---
try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("A variável de ambiente GOOGLE_API_KEY não foi encontrada.")

    llm = ChatGoogleGenerativeAI(model="gemini-2.5-pro", temperature=0, google_api_key=api_key) # Use o modelo mais recente
    logger.info("LLM (Gemini) inicializado com sucesso.")

    # ========================================================================
    # --- CHAIN DA RECEPCIONISTA (PRIMEIRO CONTATO HUMANIZADO) ---
    # ========================================================================
    logger.info("Definindo Chain Recepcionista...")
    
    class RecepcionistaOutput(BaseModel):
        nome_extraido: Optional[str] = Field(description="O nome do paciente, SE ele tiver se apresentado. Caso contrário, retorne null.")
        procedimento_especialidade: Optional[str] = Field(description="Se o paciente já informou O NOME do exame (ex: Eletrocardiograma) ou especialidade médica, extraia aqui. Senão, null.")
        intencao: Literal['exame_geral', 'exame_fetal', 'consulta', 'informacao_geral', 'humano', 'cancelamento'] = Field(description="A intenção deduzida da mensagem.")
        resposta_humanizada: str = Field(description="A resposta completa pronta para ser enviada.")

    parser_recepcionista = JsonOutputParser(pydantic_object=RecepcionistaOutput)
    prompt_recepcionista = ChatPromptTemplate.from_template(
        """# MISSÃO
        Você é Leônidas, o assistente virtual acolhedor e altamente humanizado da recepção da Clínica Limalé.
        Sua tarefa é receber a PRIMEIRA mensagem do paciente, interpretá-la, extrair o nome (se ele falar) e dar uma resposta de boas-vindas contextualizada, fluida e natural.

        # CONTEXTO DA CLÍNICA
        - O que somos: Clínica Limalé — centro de referência em gestação, ultrassom fetal e cardiologia avançada.
        - Endereço: Rua Orense, 41 – Sala 512, Condomínio D Office, centro de Diadema/SP.

        # DADOS DO ATENDIMENTO
        - Nome do paciente já registrado no banco (se estiver vazio, é a primeira vez dele): "{nome_conhecido}"
        - Mensagem enviada pelo paciente agora: "{user_message}"
        - Pular Saudação: "{pular_saudacao}"

        # REGRAS PARA A RESPOSTA HUMANIZADA E FORMATAÇÃO
        1. Formatação Visual Obrigatória (Respiro): 
           - A sua resposta NÃO PODE ser um bloco único de texto colado. Você DEVE usar quebras de linha duplas (\\n\\n) para separar as ideias, deixando o texto leve e agradável de ler no WhatsApp.
        
        2. A Regra do Nome (Prioridade Máxima):
           - Se "{nome_conhecido}" estiver VAZIO e o paciente NÃO disser o nome dele na mensagem atual, sua ÚNICA pergunta no final da sua resposta deve ser: "Para continuarmos de forma mais próxima, como você gostaria de ser chamado(a)?" (NÃO fale de exames ou horários ainda).

        3. Acolhimento e Apresentação (REGRA ANTI-REPETIÇÃO MÁXIMA): 
           - SE "{pular_saudacao}" for "SIM", você está PROIBIDO de fazer a apresentação inicial. NÃO diga "Sou o Leônidas...", NÃO diga "Que bom ter você de volta" e NÃO dê "Bom dia/Boa tarde". Vá DIRETO para a Regra 5 (Direcionamento).
           - CASO CONTRÁRIO ("NAO"):
               - Parágrafo 1: Inicie com uma saudação e o nome do paciente (ex: "Bom dia, [Nome]! 🤍").
               - Parágrafo 2: Use EXATAMENTE esta frase: "Sou o Leônidas, assistente da Clínica Limalé — centro de referência em gestação, ultrassom fetal e cardiologia avançada."
               - Parágrafo 3: Se "{nome_conhecido}" estiver VAZIO, adicione: "Será um prazer te atender." Se for antigo, use: "Que bom ter você de volta! Será um prazer te atender."

        4. Informações Extras da Clínica (Se solicitado):
           - Se o paciente pediu "informações da clínica", perguntou "onde fica" ou "endereço" em '{user_message}', inclua o nosso endereço (Rua Orense...) em um novo parágrafo.

        5. Contexto e Direcionamento Suave (APENAS se a questão do nome já estiver resolvida): 
           - NUNCA pergunte sobre preferências de horários ou datas nesta etapa.
           - MENSAGEM GENÉRICA DO SITE ("gostaria de mais informações"): Termine com um parágrafo perguntando: "Em que posso ajudar? Você busca informações sobre Exames ou Consultas?"
           - EXAME DE MEDICINA FETAL / ECOCARDIOGRAMA: Não pergunte qual exame a pessoa quer. 
             - SE O EXAME FOR ECOCARDIOGRAMA FETAL, use EXATAMENTE esta frase final: "O ecocardiograma fetal é o exame específico para avaliar a estrutura e o funcionamento do coração do bebê durante a gestação. Para te orientar corretamente, poderia me informar de quantas semanas de gestação você está hoje, por favor?"
             - SE FOR OUTRO EXAME (Morfológico, Ultrassom, Fetal), use EXATAMENTE: "Para te orientar corretamente, poderia me informar com quantas semanas de gestação você está hoje, por favor?"
           - MENSAGEM DE MARKETING OU EXAME GERAL (Ex: "preço do eletrocardiograma"): Não peça para a pessoa repetir o exame. Confirme que realizamos o exame e pergunte: "Gostaria de verificar os valores e os horários disponíveis?"

        6. O que NÃO Fazer: NÃO envie menus com números (1, 2, 3) se a mensagem do usuário for um texto longo. Aja estritamente como um humano simpático.

        # REGRAS PARA CLASSIFICAÇÃO DA INTENÇÃO (Campo 'intencao')
        - 'exame_fetal': Ultrassom de gravidez, obstétrico, morfológico, transvaginal, ecocardiograma fetal.
        - 'exame_geral': Eletrocardiograma, sangue, exames não relacionados à gravidez.
        - 'consulta': Se a pessoa quer passar com um médico, cita especialidades (ginecologista, cardio) ou "marcar consulta".
        - 'informacao_geral': Dúvida genérica ("onde fica a clínica?") sem deixar claro se quer exame ou consulta.
        - 'cancelamento': Se o paciente deseja desmarcar, cancelar, reagendar ou diz que não poderá comparecer.
        - 'humano': Se pediu para falar com recepção, atendente, ou mencionou "outros assuntos".

        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}
        """,
        partial_variables={"format_instructions": parser_recepcionista.get_format_instructions()},
    )
    chain_recepcionista = prompt_recepcionista | llm | parser_recepcionista
    logger.info("Chain Recepcionista definida com sucesso.")
    # ========================================================================

    # --- CHAIN DE FAQ ---
    logger.info("Definindo Chain FAQ...")
    class FaqOutput(BaseModel):
        resposta: str = Field(description="A resposta à pergunta do usuário, baseada estritamente na base de conhecimento.")

    parser_faq = JsonOutputParser(pydantic_object=FaqOutput)
    prompt_faq_template = ChatPromptTemplate.from_template(
        """# MISSÃO
        Você é a secretária Leonidas. Responda à pergunta do usuário usando APENAS a base de conhecimento e o nome dele para criar uma conexão.

        # BASE DE CONHECIMENTO (FAQ)
        {faq}

        # NOME DO USUÁRIO
        {nome_usuario}

        # REGRAS ATUALIZADAS DE PERSONALIDADE
        - Sempre que possível, inicie a resposta se dirigindo ao usuário pelo nome dele (ex: "Claro, [nome_usuario]!").
        - Se a resposta estiver na base, responda de forma acolhedora e, AO FINAL, adicione uma sugestão proativa. Exemplo: "Posso te ajudar com mais alguma informação ou gostaria de agendar uma consulta?".
        - Se a resposta NÃO estiver na base, responda EXATAMENTE com: "Desculpe, {nome_usuario}, não disponho dessa informação específica. Posso te ajudar a agendar uma consulta, consultar preços ou verificar seus sintomas?".

        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}

        # PERGUNTA DO USUÁRIO
        {pergunta_do_usuario}""",
        partial_variables={"format_instructions": parser_faq.get_format_instructions()},
    )
    chain_faq = prompt_faq_template | llm | parser_faq
    logger.info("Chain FAQ definida com sucesso.")

    logger.info("Todas as chains de IA foram definidas com sucesso.")

# --- BLOCO EXCEPT ÚNICO COM LOG DETALHADO ---
except Exception as e:
    logger.critical(f"FALHA CRÍTICA AO INICIALIZAR UMA OU MAIS CHAINS DE IA: {type(e).__name__} - {e}", exc_info=True)
    chain_faq = chain_recepcionista = None 
    logger.warning("Variáveis de chain foram definidas como None...")