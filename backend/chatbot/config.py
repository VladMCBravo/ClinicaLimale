# chatbot/config.py
"""
Configurações centralizadas do chatbot
"""

# Timeouts e limites
TIMEOUT_INATIVIDADE_MINUTOS = 10
LIMITE_TENTATIVAS_VALIDACAO = 3
LIMITE_HISTORICO_INTERACOES = 20

# Durações de agendamento
DURACAO_CONSULTA_MINUTOS = 50
DURACAO_PROCEDIMENTO_MINUTOS = 60

# Mensagens padrão
MENSAGENS = {
    'boas_vindas': "Olá! Seja bem-vindo à Clínica Limalé. 👋\nEu sou o Leônidas, assistente virtual da clínica.",
    'erro_generico': "Desculpe, ocorreu um erro. Nossa equipe técnica foi notificada.",
    'timeout': "Notei que ficou um tempo sem responder. Deseja continuar?",
    'dados_invalidos': "Os dados informados não estão corretos. Pode tentar novamente?",
    'agendamento_sucesso': "🎉 Agendamento realizado com sucesso!",
    'despedida': "Obrigado pelo contato! Estamos sempre aqui quando precisar. 🏥"
}

# Estados do chatbot
ESTADOS = {
    'INICIO': 'inicio',
    'AGUARDANDO_NOME': 'aguardando_nome',
    'IDENTIFICANDO_DEMANDA': 'identificando_demanda',
    'TIMEOUT': 'awaiting_inactivity_response',
    'AGENDAMENTO_INICIO': 'agendamento_inicio',
    'TRIAGEM_SINTOMAS': 'triagem_processar_sintomas',
    'CANCELAMENTO': 'cancelamento_inicio'
}

# Configurações de analytics
ANALYTICS = {
    'eventos_importantes': [
        'inicio_conversa',
        'agendamento_completo',
        'abandono_conversa',
        'erro_chatbot',
        'especialidade_selecionada'
    ],
    'periodo_retencao_dias': 90
}

# Configurações de validação
VALIDACAO = {
    'cpf_obrigatorio': True,
    'telefone_obrigatorio': True,
    'email_obrigatorio': True,
    'nome_minimo_palavras': 2,
    'idade_maxima_anos': 120
}

# Horários de funcionamento para procedimentos
HORARIOS_PROCEDIMENTOS = {
    0: [{'inicio': '08:00', 'fim': '18:00'}],  # Segunda
    1: [{'inicio': '08:00', 'fim': '18:00'}],  # Terça
    2: [{'inicio': '08:00', 'fim': '18:00'}],  # Quarta
    3: [{'inicio': '08:00', 'fim': '18:00'}],  # Quinta
    4: [{'inicio': '08:00', 'fim': '18:00'}],  # Sexta
}

# Configurações de recuperação de conversa
RECUPERACAO = {
    'tempo_minimo_horas': 1,
    'tempo_maximo_dias': 1,
    'estados_recuperaveis': [
        'agendamento_awaiting_slot_choice',
        'cadastro_awaiting_adult_data',
        'triagem_processar_sintomas'
    ]
}