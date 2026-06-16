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
        nome_extraido: Optional[str] = Field(description="Nome do paciente. SEJA AGRESSIVO NA BUSCA: extraia nomes de saudações informais (ex: 'Oi, sou a Maria', 'Aqui é o João', 'Queria marcar pra Sofia'). Retorne apenas o nome. Retorne Null APENAS se não houver NENHUMA pista do nome na conversa.")
        data_nascimento: Optional[str] = Field(description="Data de nascimento no formato YYYY-MM-DD. REGRA DE OURO BRASILEIRA: O usuário SEMPRE digita DIA/MÊS/ANO. Exemplo absoluto: '05/10/1978' significa Dia 05, Mês 10 (Outubro). Você DEVE retornar '1978-10-05'. Se você retornar '1978-05-10', o sistema irá falhar gravemente. Preste atenção ao mês! Null se não informado.")
        email_extraido: Optional[str] = Field(description="Email do paciente. Null se não informado.")
        
        # --- FUNIL GERAL E DE EXAMES (AGORA COM O CATÁLOGO DA CLÍNICA) ---
        exame_interesse: Optional[str] = Field(description="""O tipo de exame ou consulta desejada. Tente enquadrar a fala do paciente nas categorias da nossa clínica:
        - Consultas: Cardiologia, Ginecologia, Neonatologia, Obstetrícia, Ortopedia, Pediatria.
        - Doppler: Arterial ou Venoso de membros inferiores/superiores[cite: 8, 9, 15].
        - Ecocardiograma: Adulto, Fetal, Pediátrico ou com STRAIN[cite: 29, 30].
        - Medicina Fetal: Morfológico (1º e 2º Tri, incluindo Gemelar/Trigemelar), Obstétrico (simples, com Doppler, 3D/4D), Translucência Nucal, Perfil Biofísico[cite: 31, 32, 39].
        - US Musculoesquelético: Ombro, Joelho, Mão, Pé, Cotovelo, Bursite, Tendão de Aquiles[cite: 40, 41, 46, 52].
        - US Geral/Com Doppler: Abdome (Total, Superior, Inferior), Transvaginal, Pélvico, Mamas, Tireoide, Rins/Vias Urinárias, Próstata[cite: 56, 57, 64].
        - Outros: Eletrocardiograma (ECG express ou 1 dia útil)[cite: 54, 55].
        Retorne o nome do exame mais próximo dessa lista. Null se não for mencionado.""")
        medico_solicitante: Optional[str] = Field(description="Nome do médico ou profissional que pediu o exame. Se a paciente responder que está procurando 'por conta própria', retorne 'Conta Própria'. Null se não mencionado.")
        motivo_exame: Optional[Literal['rotina', 'investigacao_dor', 'acompanhamento', 'urgencia']] = Field(description="Classifique o motivo do exame. Use 'investigacao_dor' se o paciente relatar dor ou desconforto. Null se não for possível deduzir.")

        # --- FUNIL OBSTÉTRICO (GESTANTES) ---
        semanas_gestacao: Optional[int] = Field(description="Número de semanas de gestação. Se a paciente disser algo como 'estou de 20 semanas', extraia o número 20. Null se não for gestante ou não informado.")
        primeira_gravidez: Optional[bool] = Field(description="True se mencionar que é o primeiro filho. Null se não mencionado.")
        sexo_bebe: Optional[Literal['menino', 'menina', 'surpresa']] = Field(description="Sexo do bebê. Null se não mencionado.")

        # --- FUNIL COMERCIAL E VENDAS ---
        agendou: Optional[bool] = Field(description="True se confirmou o agendamento. False se desistiu. Null se a conversa ainda não foi concluída.")
        motivo_desistencia: Optional[Literal['preco', 'horario', 'localizacao', 'precisa_pedido_medico', 'outro']] = Field(description="Se agendou=False, classifique o motivo da desistência ou do 'vou pensar'. Null se não desistiu.")
        concorrencia_mencionada: Optional[str] = Field(description="Nome de outra clínica ou laboratório. Null se não mencionar.")
        nivel_urgencia: Optional[Literal['frio', 'morno', 'quente']] = Field(description="Frio: só pesquisando preço/solicitando tabela. Morno: tem dúvidas sobre o procedimento. Quente: está com dor, pressa, ou quer agendar para hoje/amanhã.")
        origem_aquisicao: Optional[Literal['GOOGLE', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'SITE', 'INDICAÇÃO', 'MÉDICO', 'CONVÊNIO', 'OUTRO']] = Field(description="De onde o paciente veio ou onde viu o anúncio. Null se não for possível identificar.")

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