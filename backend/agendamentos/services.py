# backend/agendamentos/services.py - VERSÃO FINAL E CORRETA

import logging 
from django.utils import timezone
from datetime import timedelta, time, date
import datetime
from usuarios.models import CustomUser, JornadaDeTrabalho
from agendamentos.models import Agendamento
from faturamento.models import Pagamento
from django.contrib.auth import get_user_model
from faturamento.services.inter_service import gerar_cobranca_pix, gerar_link_pagamento_cartao
from pacientes.models import Paciente

logger = logging.getLogger(__name__)

def buscar_horarios_para_data(data_selecionada, medico_id, especialidade_id):
    """
    Busca todos os horários disponíveis para um médico em uma data específica,
    retornando um objeto estruturado com o motivo em caso de não haver horários.
    """
    try:
        medico = CustomUser.objects.get(pk=medico_id, cargo='medico')
    except CustomUser.DoesNotExist:
        return {
            "status": "erro", 
            "horarios": [], 
            "motivo": "O profissional selecionado não foi encontrado."
        }

    DURACAO_CONSULTA_MINUTOS = 20
    
    dia_da_semana = data_selecionada.weekday()
    jornadas_do_dia = JornadaDeTrabalho.objects.filter(medico=medico, dia_da_semana=dia_da_semana)

    if not jornadas_do_dia.exists():
        return {
            "status": "sem_jornada", 
            "horarios": [], 
            "motivo": "O profissional selecionado não atende neste dia da semana."
        }

    agendamentos_existentes = Agendamento.objects.filter(
        medico=medico,
        data_hora_inicio__date=data_selecionada,
        status__in=['Agendado', 'Confirmado']
    )
    
    horarios_ocupados = {ag.data_hora_inicio.astimezone(timezone.get_current_timezone()) for ag in agendamentos_existentes}
    
    horarios_disponiveis = []
    
    for jornada in jornadas_do_dia:
        horario_slot = timezone.make_aware(datetime.datetime.combine(data_selecionada, jornada.hora_inicio))
        hora_fim_turno = jornada.hora_fim

        while horario_slot.time() < hora_fim_turno:
            if horario_slot > timezone.now() and horario_slot not in horarios_ocupados:
                horarios_disponiveis.append(horario_slot.strftime('%H:%M'))
            
            horario_slot += timedelta(minutes=DURACAO_CONSULTA_MINUTOS)

    if not horarios_disponiveis:
        return {
            "status": "sem_horarios", 
            "horarios": [], 
            "motivo": "Não há mais horários disponíveis para este dia. Todos os horários já foram preenchidos."
        }

    return {
        "status": "sucesso",
        "horarios": sorted(horarios_disponiveis),
        "motivo": None
    }

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

def buscar_proximo_horario_disponivel(medico_id: int, data_inicial: date = None):
    """
    Busca o próximo dia e horários disponíveis para um médico.
    NOVA FUNCIONALIDADE: Aceita uma `data_inicial` para começar a busca a partir do dia seguinte.
    """
    try:
        medico = CustomUser.objects.get(id=medico_id, cargo='medico')
        
        # Define o ponto de partida da busca
        if data_inicial:
            data_de_busca = data_inicial + timedelta(days=1)
        else:
            data_de_busca = timezone.now().date()

        # Loop para encontrar o próximo dia com jornada de trabalho (limite de 90 dias)
        for i in range(90):
            dia_da_semana = data_de_busca.weekday()
            
            try:
                jornada = JornadaDeTrabalho.objects.get(medico=medico, dia_da_semana=dia_da_semana, ativo=True)
            except JornadaDeTrabalho.DoesNotExist:
                data_de_busca += timedelta(days=1)
                continue

            # Se encontrou jornada, busca agendamentos existentes para aquele dia
            agendamentos_do_dia = Agendamento.objects.filter(
                medico=medico,
                data_hora_inicio__date=data_de_busca,
                status__in=['Agendado', 'Confirmado']
            ).values_list('data_hora_inicio', flat=True)

            horarios_ocupados = {ag.time() for ag in agendamentos_do_dia}
            
            # Gera os slots disponíveis
            horarios_disponiveis = []
            intervalo = timedelta(minutes=jornada.intervalo_consulta)
            slot_atual = jornada.hora_inicio
            
            while slot_atual < jornada.hora_fim:
                # Verifica se o horário é no futuro (não no passado)
                datetime_slot = timezone.make_aware(datetime.datetime.combine(data_de_busca, slot_atual))
                if datetime_slot > timezone.now() and slot_atual not in horarios_ocupados:
                    horarios_disponiveis.append(slot_atual.strftime('%H:%M'))
                slot_atual = (datetime.datetime.combine(data_de_busca, slot_atual) + intervalo).time()

            if horarios_disponiveis:
                return {
                    "data": data_de_busca.strftime('%Y-%m-%d'),
                    "horarios_disponiveis": horarios_disponiveis
                }

            # Se não há horários, tenta o próximo dia
            data_de_busca += timedelta(days=1)

        # Se o loop terminar sem encontrar nada
        return {"data": None, "horarios_disponiveis": []}

    except CustomUser.DoesNotExist:
        return {"error": "Médico não encontrado"}
    except Exception as e:
        # Adicione um log de erro aqui se desejar
        return {"error": str(e)}

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