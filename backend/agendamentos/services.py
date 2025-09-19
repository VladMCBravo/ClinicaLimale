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
    agendamento = agendamento_instance
    
    # --- LÓGICA DE EXPIRAÇÃO ATUALIZADA E ABRANGENTE ---
    # Define os cargos que NÃO devem ter agendamentos com expiração automática.
    cargos_isentos = ['recepcao', 'admin'] 

    # A condição agora foi simplificada para aplicar a expiração a QUALQUER agendamento
    # que não seja criado por um usuário com cargo isento (ex: via WhatsApp).
    # Removemos a verificação "agendamento.modalidade == 'Telemedicina'".
    if (not agendamento.expira_em and
            (not usuario_logado or usuario_logado.cargo not in cargos_isentos)):
        agendamento.expira_em = timezone.now() + timedelta(minutes=15)
        agendamento.save()

    # --- LÓGICA DE CÁLCULO DE VALOR (PERMANECE IGUAL) ---
    valor_do_pagamento = 0.00 

    if agendamento.tipo_agendamento == 'Consulta' and agendamento.tipo_atendimento == 'Particular':
        if agendamento.especialidade and agendamento.especialidade.valor_consulta:
            valor_do_pagamento = agendamento.especialidade.valor_consulta

    elif agendamento.tipo_agendamento == 'Procedimento' and agendamento.tipo_atendimento == 'Particular':
        if agendamento.procedimento and agendamento.procedimento.valor_particular:
            valor_do_pagamento = agendamento.procedimento.valor_particular

    elif agendamento.tipo_atendimento == 'Convenio' and agendamento.procedimento and agendamento.plano_utilizado:
        valor_acordado = agendamento.procedimento.valores_convenio.filter(plano_convenio=agendamento.plano_utilizado).first()
        if valor_acordado:
            valor_do_pagamento = valor_acordado.valor

    # Encontra um usuário de serviço para registrar o pagamento
    User = get_user_model()
    try:
        usuario_servico = User.objects.get(username='servico_sistema')
    except User.DoesNotExist:
        usuario_servico = User.objects.filter(is_superuser=True).first() or usuario_logado

    # Cria o objeto de Pagamento
    Pagamento.objects.create(
        agendamento=agendamento,
        paciente=agendamento.paciente,
        valor=valor_do_pagamento,
        status='Pendente',
        registrado_por=usuario_servico
    )

    return agendamento