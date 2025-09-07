# backend/agendamentos/services.py
from django.utils import timezone
from datetime import timedelta
from faturamento.models import Pagamento
from django.contrib.auth import get_user_model

def criar_agendamento_e_pagamento_pendente(agendamento_instance, usuario_logado):
    """
    Função de serviço que centraliza a regra de negócio para criar um agendamento
    e seu respectivo pagamento pendente, agora com a nova lógica de valores.
    """
    agendamento = agendamento_instance
    
    # Lógica de expiração para Telemedicina (sem alterações)
    if agendamento.modalidade == 'Telemedicina' and not agendamento.expira_em:
        agendamento.expira_em = timezone.now() + timedelta(minutes=15)
        agendamento.save()
    # --- LÓGICA DE CÁLCULO DE VALOR TOTALMENTE ATUALIZADA ---
    valor_do_pagamento = 0.00 

    # Se for uma CONSULTA PARTICULAR, o valor vem da ESPECIALIDADE
    if agendamento.tipo_agendamento == 'Consulta' and agendamento.tipo_atendimento == 'Particular':
        if agendamento.especialidade and agendamento.especialidade.valor_consulta:
            valor_do_pagamento = agendamento.especialidade.valor_consulta

    # Se for um PROCEDIMENTO PARTICULAR, o valor vem do PROCEDIMENTO
    elif agendamento.tipo_agendamento == 'Procedimento' and agendamento.tipo_atendimento == 'Particular':
        if agendamento.procedimento and agendamento.procedimento.valor_particular:
            valor_do_pagamento = agendamento.procedimento.valor_particular

    # Se for CONVÊNIO, a lógica continua baseada no procedimento acordado com o plano
    elif agendamento.tipo_atendimento == 'Convenio' and agendamento.procedimento and agendamento.plano_utilizado:
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