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
from pacientes.models import Paciente

logger = logging.getLogger(__name__)

def buscar_proximo_horario_procedimento(procedimento_id):
    """
    Busca o próximo horário disponível para um procedimento específico.
    A lógica é baseada nos horários de funcionamento da clínica para exames
    e na capacidade de apenas um procedimento por vez.
    """
    # --- PARÂMETROS DE NEGÓCIO PARA PROCEDIMENTOS (AJUSTE CONFORME NECESSÁRIO) ---
    DURACAO_PROCEDIMENTO_MINUTOS = 60 # Duração padrão de um exame
    DIAS_PARA_BUSCA = 90
    # Horários de funcionamento para exames (Segunda=0, Terça=1, etc.)
    HORARIOS_FUNCIONAMENTO_EXAMES = {
        0: [{'inicio': time(8, 0), 'fim': time(18, 0)}], # Segunda
        1: [{'inicio': time(8, 0), 'fim': time(18, 0)}], # Terça
        2: [{'inicio': time(8, 0), 'fim': time(18, 0)}], # Quarta
        3: [{'inicio': time(8, 0), 'fim': time(18, 0)}], # Quinta
        4: [{'inicio': time(8, 0), 'fim': time(18, 0)}], # Sexta
    }

    hoje = timezone.localtime(timezone.now()).date()
    data_fim_busca = hoje + timedelta(days=DIAS_PARA_BUSCA)

    # Busca todos os outros procedimentos já agendados
    procedimentos_existentes = Agendamento.objects.filter(
        tipo_agendamento='Procedimento',
        data_hora_inicio__date__range=[hoje, data_fim_busca],
        status__in=['Agendado', 'Confirmado']
    )

    data_atual = hoje
    while data_atual <= data_fim_busca:
        dia_semana_atual = data_atual.weekday()
        if dia_semana_atual in HORARIOS_FUNCIONAMENTO_EXAMES:
            horarios_disponiveis_dia = []
            agendamentos_do_dia = [ag for ag in procedimentos_existentes if ag.data_hora_inicio.date() == data_atual]

            for turno in HORARIOS_FUNCIONAMENTO_EXAMES[dia_semana_atual]:
                horario_slot_inicio = timezone.make_aware(datetime.datetime.combine(data_atual, turno['inicio']))
                
                while horario_slot_inicio.time() < turno['fim']:
                    horario_slot_fim = horario_slot_inicio + timedelta(minutes=DURACAO_PROCEDIMENTO_MINUTOS)
                    
                    slot_esta_livre = True
                    if horario_slot_inicio <= timezone.now():
                        slot_esta_livre = False
                    else:
                        for ag_existente in agendamentos_do_dia:
                            if horario_slot_inicio < ag_existente.data_hora_fim and horario_slot_fim > ag_existente.data_hora_inicio:
                                slot_esta_livre = False
                                break
                    
                    if slot_esta_livre:
                        horarios_disponiveis_dia.append(horario_slot_inicio.strftime('%H:%M'))
                    
                    horario_slot_inicio += timedelta(minutes=DURACAO_PROCEDIMENTO_MINUTOS)
            
            if horarios_disponiveis_dia:
                return {
                    "data": data_atual.strftime('%Y-%m-%d'),
                    "horarios_disponiveis": sorted(horarios_disponiveis_dia)
                }
        data_atual += timedelta(days=1)

    return {"data": None, "horarios_disponiveis": []}

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

    DURACAO_CONSULTA_MINUTOS = 20
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

def listar_agendamentos_futuros(cpf):
    """Busca no banco de dados todos os agendamentos futuros de um paciente."""
    try:
        paciente = Paciente.objects.get(cpf=cpf)
        agora = timezone.now()
        
        agendamentos = Agendamento.objects.filter(
            paciente=paciente,
            data_hora_inicio__gte=agora,
            status__in=['Agendado', 'Confirmado']
        ).order_by('data_hora_inicio')
        
        return list(agendamentos)
    except Paciente.DoesNotExist:
        return []

def cancelar_agendamento_service(agendamento_id):
    """Altera o status de um agendamento para 'Cancelado'."""
    try:
        agendamento = Agendamento.objects.get(id=agendamento_id)
        
        agendamento.status = 'Cancelado'
        agendamento.save()
        
        if hasattr(agendamento, 'pagamento'):
            pagamento = agendamento.pagamento
            pagamento.status = 'Cancelado'
            pagamento.save()
            
        return {"status": "sucesso", "mensagem": "Agendamento cancelado com sucesso."}
    except Agendamento.DoesNotExist:
        return {"status": "erro", "mensagem": "Agendamento não encontrado."}