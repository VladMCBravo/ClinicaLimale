# backend/agendamentos/services.py - VERSÃO FINAL E CORRETA

import logging 
from django.utils import timezone
from datetime import timedelta, time
import datetime
from usuarios.models import CustomUser, JornadaDeTrabalho
from agendamentos.models import Agendamento
from faturamento.models import Pagamento
from django.contrib.auth import get_user_model
from faturamento.services.inter_service import gerar_cobranca_pix, gerar_link_pagamento_cartao

logger = logging.getLogger(__name__)

# A função agora aceita um novo parâmetro: initiated_by_chatbot
def criar_agendamento_e_pagamento_pendente(agendamento_instance, usuario_logado, metodo_pagamento_escolhido='PIX', initiated_by_chatbot=False):
    agendamento = agendamento_instance
    cargos_isentos_manualmente = ['recepcao', 'admin']

    # Lógica de cálculo de valor (está correta)
    valor_do_pagamento = 0.00
    if agendamento.tipo_agendamento == 'Consulta':
        if agendamento.especialidade and agendamento.especialidade.valor_consulta:
            valor_do_pagamento = agendamento.especialidade.valor_consulta
    elif agendamento.tipo_agendamento == 'Procedimento':
        if agendamento.procedimento and agendamento.procedimento.valor_particular:
            valor_do_pagamento = agendamento.procedimento.valor_particular
    
    pagamento = Pagamento.objects.create(
        agendamento=agendamento,
        paciente=agendamento.paciente,
        valor=valor_do_pagamento,
        status='Pendente',
        registrado_por=usuario_logado
    )
    
    # --- LÓGICA DE GERAÇÃO DE PAGAMENTO FINAL E CORRETA ---
    gerar_pagamento = False
    
    # Se a chamada veio explicitamente do chatbot, ignore outras regras e gere o pagamento.
    if initiated_by_chatbot:
        gerar_pagamento = True
    # Senão, aplique as regras normais para usuários (ex: recepção não gera).
    elif not usuario_logado or usuario_logado.cargo not in cargos_isentos_manualmente:
        gerar_pagamento = True

    if gerar_pagamento and valor_do_pagamento > 0:
        logger.warning("[SERVICE-DIAG] Gerando pagamento automático.")
        if metodo_pagamento_escolhido == 'PIX':
            gerar_cobranca_pix(pagamento, minutos_expiracao=15)
        elif metodo_pagamento_escolhido == 'CartaoCredito':
            gerar_link_pagamento_cartao(pagamento, minutos_expiracao=15)

        if hasattr(pagamento, 'pix_expira_em') and pagamento.pix_expira_em:
            agendamento.expira_em = pagamento.pix_expira_em
            agendamento.save()
    else:
        logger.warning("[SERVICE-DIAG] Usuário é %s e a chamada não veio do chatbot. Nenhum pagamento automático gerado.", usuario_logado.username)

    return agendamento

def buscar_proximo_horario_disponivel(medico_id):
    """
    Função centralizada que busca o próximo dia e horários disponíveis para um médico.
    VERSÃO FINAL CORRIGIDA: Acessa os dados do turno como um dicionário.
    """
    try:
        medico = CustomUser.objects.get(pk=medico_id, cargo='medico')
    except CustomUser.DoesNotExist:
        return {"data": None, "horarios_disponiveis": []}

    DURACAO_CONSULTA_MINUTOS = 50
    DIAS_PARA_BUSCA = 90
    
    jornadas = JornadaDeTrabalho.objects.filter(medico=medico)
    horarios_de_trabalho = {}
    for j in jornadas:
        if j.dia_da_semana not in horarios_de_trabalho:
            horarios_de_trabalho[j.dia_da_semana] = []
        # Esta parte está correta, cria dicionários
        horarios_de_trabalho[j.dia_da_semana].append({'inicio': j.hora_inicio, 'fim': j.hora_fim})

    if not horarios_de_trabalho:
        return {"data": None, "horarios_disponiveis": []}

    hoje = timezone.localtime(timezone.now()).date()
    data_fim_busca = hoje + timedelta(days=DIAS_PARA_BUSCA)
    
    agendamentos_existentes = Agendamento.objects.filter(
        medico=medico,
        data_hora_inicio__range=[
            timezone.make_aware(datetime.datetime.combine(hoje, time.min)),
            timezone.make_aware(datetime.datetime.combine(data_fim_busca, time.max))
        ],
        status__in=['Agendado', 'Confirmado']
    ).values_list('data_hora_inicio', flat=True)

    horarios_ocupados = {ag.astimezone(timezone.get_current_timezone()) for ag in agendamentos_existentes}

    data_atual = hoje
    while data_atual <= data_fim_busca:
        dia_semana_atual = data_atual.weekday()
        if dia_semana_atual in horarios_de_trabalho:
            horarios_disponiveis_dia = []
            for turno in horarios_de_trabalho[dia_semana_atual]:
                # --- A CORREÇÃO ESTÁ AQUI ---
                hora_inicio_turno = turno['inicio']
                hora_fim_turno = turno['fim']
                
                horario_slot = timezone.make_aware(datetime.datetime.combine(data_atual, hora_inicio_turno))
                while horario_slot.time() < hora_fim_turno:
                # --- FIM DA CORREÇÃO ---
                    if horario_slot > timezone.now() and horario_slot not in horarios_ocupados:
                        horarios_disponiveis_dia.append(horario_slot.strftime('%H:%M'))
                    horario_slot += timedelta(minutes=DURACAO_CONSULTA_MINUTOS)
            
            if horarios_disponiveis_dia:
                return {
                    "data": data_atual.strftime('%Y-%m-%d'),
                    "horarios_disponiveis": sorted(horarios_disponiveis_dia)
                }
        data_atual += timedelta(days=1)

    return {"data": None, "horarios_disponiveis": []}