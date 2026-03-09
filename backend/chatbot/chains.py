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
chain_roteadora: Optional[Runnable] = None
chain_sintomas: Optional[Runnable] = None
chain_extracao_dados: Optional[Runnable] = None # Removida se não estiver sendo usada
chain_faq: Optional[Runnable] = None
chain_triagem: Optional[Runnable] = None
chain_classifica_modalidade: Optional[Runnable] = None # <-- Adicionado aqui
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
        intencao: Literal['exame_geral', 'exame_fetal', 'consulta', 'informacao_geral', 'humano'] = Field(description="A intenção deduzida da mensagem.")
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

        # REGRAS PARA A RESPOSTA HUMANIZADA E FORMATAÇÃO
        1. Formatação Visual Obrigatória (Respiro): 
           - A sua resposta NÃO PODE ser um bloco único de texto colado. Você DEVE usar quebras de linha duplas (\\n\\n) para separar as ideias, deixando o texto leve e agradável de ler no WhatsApp.
        
        2. A Regra do Nome (Prioridade Máxima):
           - Se "{nome_conhecido}" estiver VAZIO e o paciente NÃO disser o nome dele na mensagem atual, sua ÚNICA pergunta no final da sua resposta deve ser: "Para continuarmos de forma mais próxima, como você gostaria de ser chamado(a)?" (NÃO fale de exames ou horários ainda).

        3. Acolhimento e Apresentação (REGRA ANTI-REPETIÇÃO): 
           - SE a mensagem do usuário for apenas uma resposta curta informando o exame (ex: "Morfológico", "Eletrocardiograma", "Ultrassom"), PULE esta etapa inteira. NÃO faça apresentação, não diga "Sou o Leônidas" e não dê boas-vindas novamente. Vá direto para a Regra 5.
           - CASO CONTRÁRIO (primeira mensagem, "Oi", texto do site ou textão inicial):
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
        - 'humano': Se pediu para falar com recepção, atendente, ou mencionou "outros assuntos".

        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}
        """,
        partial_variables={"format_instructions": parser_recepcionista.get_format_instructions()},
    )
    chain_recepcionista = prompt_recepcionista | llm | parser_recepcionista
    logger.info("Chain Recepcionista definida com sucesso.")
    # ========================================================================

    # --- CHAIN ROTEADORA (COM MÚLTIPLAS ENTIDADES) ---
    logger.info("Definindo Chain Roteadora...")
    class RoteadorOutput(BaseModel):
        intent: str = Field(description="A intenção principal. Ex: 'iniciar_agendamento', 'buscar_preco', 'cancelar_agendamento', 'pergunta_geral', 'transferencia_humano', 'encerrar_conversa', 'triagem_sintomas'.")
        entity: Optional[str] = Field(description="A entidade principal (especialidade, procedimento, tópico da pergunta). Ex: 'Cardiologia', 'Ultrassonografia de mama'.")
        modalidade: Optional[Literal['Telemedicina', 'Presencial']] = Field(description="Se o usuário especificou a modalidade preferida.")
        medico_preferencia: Optional[str] = Field(description="Se o usuário mencionou um nome de médico específico.")
        dia_preferencia: Optional[str] = Field(description="Se o usuário mencionou um dia da semana, data ou período (ex: 'segunda', 'amanhã', 'semana que vem', 'dia 25').")
        hora_preferencia: Optional[str] = Field(description="Se o usuário mencionou um horário ou período do dia (ex: '09:00', 'manhã', 'fim da tarde').")

    parser_roteador = JsonOutputParser(pydantic_object=RoteadorOutput)
    prompt_roteador = ChatPromptTemplate.from_template(
        """# MISSÃO
        Sua missão é analisar a MENSAGEM ATUAL do usuário, usando o HISTÓRICO, determinar a intenção principal e extrair TODAS as informações relevantes fornecidas para o agendamento (entidade principal, modalidade, médico, dia, hora).

        # HISTÓRICO DA CONVERSA
        {historico_conversa}

        # REGRAS DE ROTEAMENTO E EXTRAÇÃO
        - Priorize intenções como 'transferencia_humano' ou 'encerrar_conversa'.
        - Intenção 'buscar_preco': extraia o serviço (entidade).
        - Intenção 'iniciar_agendamento':
            - Extraia a especialidade ou procedimento principal como 'entity'.
            - SE MENCIONADO, extraia 'modalidade' ('Telemedicina' ou 'Presencial').
            - SE MENCIONADO, extraia o nome do médico em 'medico_preferencia'.
            - SE MENCIONADO, extraia a preferência de dia/data em 'dia_preferencia'.
            - SE MENCIONADO, extraia a preferência de hora/período em 'hora_preferencia'.
        - Exemplo: "Quero agendar telemedicina com Dr. Ricardo na segunda de manhã" -> intent='iniciar_agendamento', entity='Consulta', modalidade='Telemedicina', medico_preferencia='Dr. Ricardo', dia_preferencia='segunda', hora_preferencia='manhã'.
        - Exemplo: "Agendar ultrassom de mama presencial semana que vem" -> intent='iniciar_agendamento', entity='Ultrassom de mama', modalidade='Presencial', dia_preferencia='semana que vem'.
        - Para outras intenções ('pergunta_geral', 'triagem_sintomas'), foque na 'intent' e 'entity'.
        - Se mencionar 'atendente', 'humano', 'pessoa', a intenção é SEMPRE 'transferencia_humano'.
        - Se mencionar 'tchau', 'obrigado', 'valeu', a intenção é 'encerrar_conversa'.
        - Se mencionar 'preço', 'valor', 'quanto custa', a intenção é 'buscar_preco'.
        - Se descreve um mal-estar ('sinto dor', 'estou com febre'), a intenção é 'triagem_sintomas'.
        - Se quer marcar algo ('agendar', 'marcar consulta'), a intenção é 'iniciar_agendamento'.
        - Se quer desmarcar ('cancelar', 'não posso ir'), a intenção é 'cancelar_agendamento'.
        - Para perguntas gerais (endereço, horário), a intenção é 'pergunta_geral'.

        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}

        # MENSAGEM ATUAL DO USUÁRIO
        {user_message}""",
        partial_variables={"format_instructions": parser_roteador.get_format_instructions()},
    )
    chain_roteadora = prompt_roteador | llm | parser_roteador
    logger.info("Chain Roteadora definida com sucesso.")
    
    # --- CHAIN DE TRIAGEM DE SINTOMAS (Se existir - Exemplo) ---
    #class SintomaOutput(BaseModel): ...
    #parser_sintomas = JsonOutputParser(...)
    #prompt_sintomas = ChatPromptTemplate.from_template(...)
    #chain_sintomas = prompt_sintomas | llm | parser_sintomas
    #logger.info("Chain de Sintomas inicializada.")

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

    # --- CHAIN DE TRIAGEM DE FLUXO ---
    logger.info("Definindo Chain de Triagem de Fluxo...")
    class TriagemFluxoOutput(BaseModel):
        intent: Literal[
            'continuacao',
            'interrupcao_pergunta',
            'interrupcao_preco',
            'interrupcao_cancelamento_fluxo',
            'transferencia_humano'
            ] = Field(description="Classificação da mensagem.")
        entity: Optional[str] = Field(description="A entidade específica se for uma interrupção relevante.")

    parser_triagem = JsonOutputParser(pydantic_object=TriagemFluxoOutput)
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
        2.  **'interrupcao_preco'**: A mensagem é uma NOVA pergunta sobre preço/valor/custo. A *entidade* deve ser o serviço perguntado.
        3.  **'interrupcao_pergunta'**: A mensagem é uma pergunta geral (endereço, etc.) que NÃO é sobre preço e NÃO continua o fluxo. A *entidade* pode ser o tópico.
        4.  **'interrupcao_cancelamento_fluxo'**: O usuário quer PARAR o processo ATUAL ('deixa pra lá', 'não quero mais').
        5.  **'transferencia_humano'**: O usuário pede para falar com um humano ('atendente', 'falar com alguém'). Ignora todo o resto.

        # IMPORTANTE
        - Priorize 'continuacao' se a mensagem parecer minimamente relacionada ao input esperado.

        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}
        """,
        partial_variables={"format_instructions": parser_triagem.get_format_instructions()},
    )
    chain_triagem = prompt_triagem_template | llm | parser_triagem
    logger.info("Chain de Triagem de Fluxo definida com sucesso.")

    # --- CHAIN DE CLASSIFICAÇÃO DE MODALIDADE ---
    logger.info("Definindo Chain de Classificação de Modalidade...")
    class ClassificaModalidadeOutput(BaseModel):
        modalidade_escolhida: Literal['Telemedicina', 'Presencial', 'Indefinido'] = Field(description="A modalidade escolhida pelo usuário ou 'Indefinido' se não for claro.")

    parser_modalidade = JsonOutputParser(pydantic_object=ClassificaModalidadeOutput)
    prompt_modalidade = ChatPromptTemplate.from_template(
        """# MISSÃO
        Você precisa classificar a resposta do usuário à pergunta "Prefere Telemedicina ou Presencial?".

        # PERGUNTA FEITA AO USUÁRIO:
        Prefere *Telemedicina* ou *Presencial* em nossa clínica?

        # RESPOSTA DO USUÁRIO:
        {resposta_usuario}

        # REGRAS DE CLASSIFICAÇÃO
        - Se a resposta indicar claramente preferência por atendimento online, remoto, à distância, virtual, classifique como 'Telemedicina'.
        - Se a resposta indicar claramente preferência por ir à clínica, atendimento físico, local, aí, classifique como 'Presencial'.
        - Se a resposta for ambígua, confusa, ou não responder à pergunta (ex: perguntar o preço de novo), classifique como 'Indefinido'.
        - Se a resposta indicar preferência por online, remoto, à distância, virtual, vídeo, videochamada, classifique como 'Telemedicina'. # <-- Mais exemplos
        - Se a resposta indicar preferência por ir à clínica, físico, local, aí, pessoalmente, classifique como 'Presencial'. # <-- Mais exemplos
        - Se a resposta for ambígua ou não responder, classifique como 'Indefinido'.
        
        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}""",
        partial_variables={"format_instructions": parser_modalidade.get_format_instructions()},
    )
    chain_classifica_modalidade = prompt_modalidade | llm | parser_modalidade
    logger.info("Chain de Classificação de Modalidade definida com sucesso.")

    logger.info("Todas as chains de IA foram definidas com sucesso.")

# --- BLOCO EXCEPT ÚNICO COM LOG DETALHADO ---
except Exception as e:
    logger.critical(f"FALHA CRÍTICA AO INICIALIZAR UMA OU MAIS CHAINS DE IA: {type(e).__name__} - {e}", exc_info=True)
    chain_roteadora = chain_faq = chain_triagem = chain_classifica_modalidade = chain_recepcionista = None 
    logger.warning("Variáveis de chain foram definidas como None...")