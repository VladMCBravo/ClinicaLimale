# backend/agendamentos/services.py
from django.utils import timezone
from datetime import timedelta
from faturamento.models import Pagamento
from django.contrib.auth import get_user_model

def criar_agendamento_e_pagamento_pendente(agendamento_instance, usuario_logado):
    """
    Função de serviço que centraliza a regra de negócio para criar um agendamento
    e seu respectivo pagamento pendente.
    """
    # 1. Salva a instância do agendamento primeiro (o serializer já fez o .save())
    agendamento = agendamento_instance
    # --- REFINAMENTO AQUI ---
    # Se a modalidade for Telemedicina, definimos um prazo de expiração.
    # Isso funciona tanto para agendamentos criados pela recepcionista quanto pelo chatbot.
    if agendamento.modalidade == 'Telemedicina' and not agendamento.expira_em:
        agendamento.expira_em = timezone.now() + timedelta(minutes=15)
        agendamento.save() # Salva o prazo no agendamento
    # 2. Lógica para determinar o valor do pagamento
    valor_do_pagamento = 0.00 # Valor padrão
    if agendamento.tipo_atendimento == 'Particular' and agendamento.procedimento:
        valor_do_pagamento = agendamento.procedimento.valor_particular
    elif agendamento.tipo_atendimento == 'Convenio' and agendamento.procedimento and agendamento.plano_utilizado:
        # Busca o valor acordado com o convênio
        valor_acordado = agendamento.procedimento.valores_convenio.filter(plano_convenio=agendamento.plano_utilizado).first()
        if valor_acordado:
            valor_do_pagamento = valor_acordado.valor

    # 3. Encontra um usuário de serviço para registrar o pagamento
    User = get_user_model()
    try:
        usuario_servico = User.objects.get(username='servico_sistema') # Um usuário genérico
    except User.DoesNotExist:
        usuario_servico = User.objects.filter(is_superuser=True).first() or usuario_logado

    # 4. Cria o objeto de Pagamento
    Pagamento.objects.create(
        agendamento=agendamento,
        paciente=agendamento.paciente,
        valor=valor_do_pagamento,
        status='Pendente',
        registrado_por=usuario_servico
    )

    return agendamento