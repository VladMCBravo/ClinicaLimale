# chatbot/chains.py

import os
import logging
from typing import Optional, Literal
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

logger = logging.getLogger(__name__)

llm = None
chain_ghost_mode = None

try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("A variável de ambiente GOOGLE_API_KEY não foi encontrada.")

    # Mantemos o modelo rápido e com temperatura 0 para extração precisa
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0, google_api_key=api_key, max_retries=0)

    # ==========================================
    # O SUPER MODELO DE EXTRAÇÃO (OS 3 FUNIS)
    # ==========================================
    class GhostModeOutput(BaseModel):
        # --- DADOS CADASTRAIS BÁSICOS ---
        nome_extraido: Optional[str] = Field(description="Nome do paciente. Null se não informado.")
        data_nascimento: Optional[str] = Field(description="Data de nascimento (YYYY-MM-DD). Null se não informado.")
        email_extraido: Optional[str] = Field(description="Email do paciente. Null se não informado.")
        
        # --- FUNIL GERAL E DE EXAMES ---
        exame_interesse: Optional[str] = Field(description="O tipo de exame ou consulta desejado. Ex: Morfológico, Eletrocardiograma. Null se não informado.")
        medico_solicitante: Optional[str] = Field(description="Nome do médico que pediu o exame. Null se não mencionado.")
        
        # CORREÇÃO AQUI (Adicionado Optional)
        motivo_exame: Optional[Literal['rotina', 'investigacao_dor', 'acompanhamento', 'urgencia']] = Field(description="Classifique o motivo do exame. Null se não for possível deduzir.")

        # --- FUNIL OBSTÉTRICO (GESTANTES) ---
        semanas_gestacao: Optional[int] = Field(description="Número de semanas de gestação, extraído apenas se for número. Null se não for gestante ou não informado.")
        primeira_gravidez: Optional[bool] = Field(description="True se mencionar que é o primeiro filho. Null se não mencionado.")
        
        # CORREÇÃO AQUI (Adicionado Optional)
        sexo_bebe: Optional[Literal['menino', 'menina', 'surpresa']] = Field(description="Sexo do bebê. Null se não mencionado.")

        # --- FUNIL COMERCIAL E VENDAS ---
        agendou: Optional[bool] = Field(description="True se confirmou o agendamento. False se desistiu. Null se a conversa ainda não foi concluída.")
        
        # CORREÇÃO AQUI (Adicionado Optional)
        motivo_desistencia: Optional[Literal['preco', 'horario', 'localizacao', 'precisa_pedido_medico', 'outro']] = Field(description="Se agendou=False, classifique o motivo da desistência. Null se não desistiu.")
        concorrencia_mencionada: Optional[str] = Field(description="Nome de outra clínica ou laboratório. Null se não mencionar.")
        
        # CORREÇÃO AQUI (Adicionado Optional)
        nivel_urgencia: Optional[Literal['frio', 'morno', 'quente']] = Field(description="Frio: pesquisando preço. Morno: dúvidas. Quente: precisa agendar logo.")
        
        # O CAMPO DE MARKETING QUE AJUSTAMOS (Com Optional)
        origem_aquisicao: Optional[Literal['GOOGLE', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'SITE', 'INDICACAO', 'MEDICO', 'CONVENIO', 'OUTRO']] = Field(description="De onde o paciente veio ou onde viu o anúncio. Null se não for possível identificar.")

    parser_ghost = JsonOutputParser(pydantic_object=GhostModeOutput)
    
    prompt_ghost = ChatPromptTemplate.from_template(
        """# MISSÃO
        Você é um analista de dados silencioso operando no CRM de uma clínica médica de imagem e consultas.
        Sua tarefa é ler a transcrição do atendimento via WhatsApp e extrair as informações do paciente para o banco de dados.

        # REGRAS DE EXTRAÇÃO
        1. NUNCA invente informações. Se o paciente não disse claramente, retorne null.
        2. Analise a conversa como um todo para deduzir o "nivel_urgencia" e o "motivo_exame".
        3. Preste muita atenção às objeções para preencher o "motivo_desistencia" corretamente.

        # MENSAGEM ATUAL DO PACIENTE
        {user_message}

        # HISTÓRICO RECENTE DA CONVERSA
        {historico}

        # INSTRUÇÕES DE FORMATAÇÃO
        {format_instructions}
        """,
        partial_variables={"format_instructions": parser_ghost.get_format_instructions()},
    )
    
    chain_ghost_mode = prompt_ghost | llm | parser_ghost

except Exception as e:
    logger.critical(f"FALHA AO INICIALIZAR IA GHOST MODE: {e}")