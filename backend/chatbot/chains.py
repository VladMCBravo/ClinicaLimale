# Em chatbot/chains.py

# --- ADICIONE ESTAS IMPORTAÇÕES NO INÍCIO DO ARQUIVO ---
import os
import logging
from typing import Optional, Literal # <--- ADICIONE Literal
from pydantic import BaseModel, Field # <--- Garanta que BaseModel e Field estão importados
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate # <--- Garanta que está importado
from langchain_core.output_parsers import JsonOutputParser # <--- Garanta que está importado
from langchain_core.runnables import Runnable # <--- Garanta que está importado

logger = logging.getLogger(__name__)

# --- CONFIGURAÇÃO E INICIALIZAÇÃO SEGURA DO "CÉREBRO" DE IA ---
llm = None
chain_roteadora: Optional[Runnable] = None
chain_sintomas: Optional[Runnable] = None
chain_extracao_dados: Optional[Runnable] = None
chain_faq: Optional[Runnable] = None
chain_triagem: Optional[Runnable] = None # <--- NOVA CHAIN

try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("A variável de ambiente GOOGLE_API_KEY não foi encontrada.")

    llm = ChatGoogleGenerativeAI(model="gemini-2.5-pro-latest", temperature=0, google_api_key=api_key) # Use o modelo mais recente
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
    class TriagemFluxoOutput(BaseModel):
        intent: Literal[
            'continuacao',
            'interrupcao_pergunta',
            'interrupcao_preco',
            'interrupcao_cancelamento_fluxo',
            'transferencia_humano'
            ] = Field(description="Classificação da mensagem. Deve ser 'continuacao', 'interrupcao_pergunta', 'interrupcao_preco', 'interrupcao_cancelamento_fluxo', 'transferencia_humano'.")
        entity: Optional[str] = Field(description="A entidade específica se for uma interrupção (ex: 'Ecocardiograma', 'endereço', 'Cardiologia'). Preencha apenas se for uma interrupção relevante.")

    parser_triagem = JsonOutputParser(pydantic_object=TriagemFluxoOutput)

    # Este prompt é o "cérebro" que protege sua máquina de estados
    prompt_triagem_template = ChatPromptTemplate.from_template(
        """# MISSÃO
        Você é um assistente de triagem de fluxo de conversa. Sua missão é analisar a MENSAGEM ATUAL do usuário e decidir se ela CONTINUA o fluxo de agendamento/cadastro/cancelamento atual ou se é uma INTERRUPÇÃO.

        # CONTEXTO ATUAL DO FLUXO
        - O bot está no estado: '{estado_atual}'
        - O bot espera esta informação do usuário: '{input_esperado}'

        # HISTÓRICO DA CONVERSA (Últimas mensagens)
        {historico_conversa}

        # MENSAGEM ATUAL DO USUÁRIO (Para análise)
        {user_message}

        # REGRAS DE CLASSIFICAÇÃO
        1.  **'continuacao'**: A mensagem responde diretamente ao que foi pedido em '{input_esperado}'.
            - Ex: Se o bot pediu especialidade, e o usuário diz 'Cardiologia'.
            - Ex: Se o bot pediu confirmação (Sim/Não), e o usuário diz 'sim'.
            - Ex: Se o bot pediu um horário da lista, e o usuário digita um horário válido.
        2.  **'interrupcao_preco'**: A mensagem é uma NOVA pergunta sobre preço/valor/custo, ignorando o fluxo atual. A *entidade* deve ser o serviço perguntado.
            - Ex: "E quanto custa o Ecocardiograma?" -> intent: 'interrupcao_preco', entity: 'Ecocardiograma'
            - Ex: "Qual valor da consulta?" -> intent: 'interrupcao_preco', entity: 'Consulta'
        3.  **'interrupcao_pergunta'**: A mensagem é uma pergunta geral (endereço, horário de funcionamento, convênio, médico específico, etc.) que NÃO é sobre preço e NÃO continua o fluxo. A *entidade* pode ser o tópico da pergunta.
            - Ex: "Qual o endereço da clínica?" -> intent: 'interrupcao_pergunta', entity: 'endereço'
            - Ex: "Vocês aceitam Unimed?" -> intent: 'interrupcao_pergunta', entity: 'Unimed'
        4.  **'interrupcao_cancelamento_fluxo'**: O usuário demonstra explicitamente que quer PARAR o processo ATUAL ('deixa pra lá', 'não quero mais agendar', 'cancelar isso', 'mudei de ideia'). Não requer entidade.
        5.  **'transferencia_humano'**: O usuário pede explicitamente para falar com um humano ('atendente', 'falar com alguém'). Não requer entidade. Ignora todo o resto se detectar isso.

        # IMPORTANTE
        - Analise a MENSAGEM ATUAL friamente. O histórico ajuda a entender o contexto, mas a classificação é sobre a *última* mensagem.
        - Se a mensagem for ambígua ou não se encaixar claramente, priorize 'continuacao' se parecer minimamente relacionado ao input esperado, caso contrário, use 'interrupcao_pergunta'.

        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}
        """,
        partial_variables={"format_instructions": parser_triagem.get_format_instructions()},
    )

    chain_triagem = prompt_triagem_template | llm | parser_triagem
    logger.info("Chain de Triagem de Fluxo inicializada.")

except Exception as e:
    logger.critical(f"FALHA CRÍTICA AO INICIALIZAR AS CHAINS DE IA: {e}", exc_info=True)
    # Garante que as chains sejam None se a inicialização falhar
    chain_roteadora = chain_sintomas = chain_faq = chain_triagem = None

    # --- CÉREBRO 3: IA DE PERGUNTAS FREQUENTES (COM MAIS CONHECIMENTO E PERSONALIDADE) ---
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

except Exception as e:
    logger.critical(f"FALHA CRÍTICA AO INICIALIZAR AS CHAINS DE IA: {e}", exc_info=True)