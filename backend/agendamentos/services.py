# backend/agendamentos/services.py

import logging 
from django.utils import timezone
from datetime import date, datetime, timedelta, time
from django.utils import timezone
from dateutil.parser import parse
from django.db.models import Q 
from .models import Sala, Agendamento, ConfiguracaoExame, BloqueioAgenda, DiaFuncionamentoExame
from usuarios.models import CustomUser, JornadaDeTrabalho
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
        return {"status": "erro", "horarios": [], "motivo": "O profissional selecionado não foi encontrado."}

    DURACAO_CONSULTA_MINUTOS = 15
    dia_da_semana = data_selecionada.weekday()
    jornadas_do_dia = JornadaDeTrabalho.objects.filter(medico=medico, dia_da_semana=dia_da_semana)

    if not jornadas_do_dia.exists():
        return {"status": "sem_jornada", "horarios": [], "motivo": "O profissional selecionado não atende neste dia da semana."}

    agendamentos_existentes = Agendamento.objects.filter(
        medico=medico, data_hora_inicio__date=data_selecionada, status__in=['Agendado', 'Confirmado']
    )
    
    horarios_ocupados = {ag.data_hora_inicio.astimezone(timezone.get_current_timezone()) for ag in agendamentos_existentes}
    horarios_disponiveis = []
    
    for jornada in jornadas_do_dia:
        horario_slot = timezone.make_aware(datetime.combine(data_selecionada, jornada.hora_inicio))
        hora_fim_turno = jornada.hora_fim

        while horario_slot.time() < hora_fim_turno:
            if horario_slot > timezone.now() and horario_slot not in horarios_ocupados:
                horarios_disponiveis.append(horario_slot.strftime('%H:%M'))
            horario_slot += timedelta(minutes=DURACAO_CONSULTA_MINUTOS)

    if not horarios_disponiveis:
        return {"status": "sem_horarios", "horarios": [], "motivo": "Não há mais horários disponíveis para este dia. Todos os horários já foram preenchidos."}

    return {"status": "sucesso", "horarios": sorted(horarios_disponiveis), "motivo": None}


def buscar_proximo_horario_procedimento(procedimento_id: int, limite_dias_retorno=3):
    """
    Busca horários livres baseando-se nas Regras de Funcionamento do Exame.
    RETORNO ALTERADO: Agora retorna uma LISTA com os próximos 'limite_dias_retorno' dias disponíveis.
    """
    try:
        config_exame = ConfiguracaoExame.objects.filter(procedimento_id=procedimento_id).first()
        if not config_exame:
            return []
            
        dias_permitidos = config_exame.dias_funcionamento.all()
        if not dias_permitidos.exists():
            return []

        if config_exame.equipamento_obrigatorio:
            sala_procedimentos = Sala.objects.filter(e_sala_exame=True, equipamentos__icontains=config_exame.equipamento_obrigatorio).first()
        else:
            sala_procedimentos = Sala.objects.filter(e_sala_exame=True).first()
            
        if not sala_procedimentos:
            return []

        agora = timezone.localtime(timezone.now())
        duracao_minutos = int(config_exame.duracao_padrao.total_seconds() / 60) if config_exame.duracao_padrao else 15
        if duracao_minutos <= 0: duracao_minutos = 15 

        dias_encontrados = [] # NOVO: Armazena múltiplos dias

        for i in range(90): 
            if len(dias_encontrados) >= limite_dias_retorno:
                break # Para de procurar se já achou a quantidade solicitada de dias

            data_atual = agora.date() + timedelta(days=i)
            dia_semana_atual = data_atual.weekday() 
            
            regra_do_dia = dias_permitidos.filter(dia_semana=dia_semana_atual).first()
            if not regra_do_dia:
                continue 
                
            horarios_disponiveis = []
            slot_atual = datetime.combine(data_atual, regra_do_dia.hora_inicio)
            hora_fim_limite = datetime.combine(data_atual, regra_do_dia.hora_fim)

            while slot_atual < hora_fim_limite:
                slot_aware = timezone.make_aware(slot_atual)
                fim_slot_aware = slot_aware + timedelta(minutes=duracao_minutos)
                
                if slot_aware > agora:
                    conflito_sala = Agendamento.objects.filter(
                        sala=sala_procedimentos,
                        status__in=['Agendado', 'Confirmado', 'Realizado', 'Em Atendimento', 'Laudando'],
                        data_hora_inicio__lt=fim_slot_aware,
                        data_hora_fim__gt=slot_aware
                    ).exists()
                    
                    if not conflito_sala:
                        horarios_disponiveis.append(slot_atual.strftime('%H:%M'))

                slot_atual += timedelta(minutes=duracao_minutos)

            if horarios_disponiveis:
                dias_encontrados.append({
                    "data": data_atual.strftime('%Y-%m-%d'),
                    "horarios_disponiveis": horarios_disponiveis
                })
                
        return dias_encontrados

    except Exception as e:
        logger.error(f"Erro ao buscar horários para procedimento: {e}", exc_info=True)
        return []


def criar_agendamento_e_pagamento_pendente(agendamento_instance, usuario_logado, metodo_pagamento_escolhido='PIX', initiated_by_chatbot=False):
    agendamento = agendamento_instance
    cargos_isentos_manualmente = ['recepcao', 'admin']

    valor_do_pagamento = 0.00
    if agendamento.tipo_agendamento == 'Consulta':
        if agendamento.especialidade and agendamento.especialidade.valor_consulta:
            valor_do_pagamento = agendamento.especialidade.valor_consulta
    elif agendamento.tipo_agendamento == 'Procedimento':
        if agendamento.procedimento and agendamento.procedimento.valor_particular:
            valor_do_pagamento = agendamento.procedimento.valor_particular
    
    pagamento = Pagamento.objects.create(
        agendamento=agendamento, paciente=agendamento.paciente, valor=valor_do_pagamento,
        status='Pendente', registrado_por=usuario_logado
    )
    
    gerar_pagamento = False
    
    if initiated_by_chatbot:
        gerar_pagamento = True
    elif not usuario_logado or usuario_logado.cargo not in cargos_isentos_manualmente:
        gerar_pagamento = True

    if gerar_pagamento and valor_do_pagamento > 0:
        if metodo_pagamento_escolhido == 'PIX':
            gerar_cobranca_pix(pagamento, minutos_expiracao=15)
        elif metodo_pagamento_escolhido == 'CartaoCredito':
            gerar_link_pagamento_cartao(pagamento, minutos_expiracao=15)

        if hasattr(pagamento, 'pix_expira_em') and pagamento.pix_expira_em:
            agendamento.expira_em = pagamento.pix_expira_em
            agendamento.save()

    return agendamento


def buscar_proximo_horario_disponivel(medico_id: int, data_inicial: date = None, limite_dias_retorno=3) -> list:
    """
    Busca os próximos dias úteis com horários disponíveis para um médico.
    RETORNO ALTERADO: Agora retorna uma LISTA com os próximos 'limite_dias_retorno' dias.
    """
    try:
        medico = CustomUser.objects.get(id=medico_id, cargo='medico', is_active=True)
        jornadas = JornadaDeTrabalho.objects.filter(medico=medico).order_by('dia_da_semana')
        if not jornadas.exists():
            return [] 

        agora = timezone.localtime(timezone.now())

        if data_inicial:
             if isinstance(data_inicial, datetime): inicio_busca = data_inicial.date()
             elif isinstance(data_inicial, date): inicio_busca = data_inicial
             else:
                  try: inicio_busca = parse(str(data_inicial)).date()
                  except: inicio_busca = agora.date()
             inicio_busca = max(inicio_busca, agora.date())
        else:
            inicio_busca = agora.date()

        limite_busca = inicio_busca + timedelta(days=90)
        data_atual = inicio_busca
        
        dias_encontrados = [] # NOVO: Armazena múltiplos dias

        while data_atual <= limite_busca:
            if len(dias_encontrados) >= limite_dias_retorno:
                break # Para de buscar ao encontrar a cota de dias

            dia_semana_py = data_atual.weekday() 
            dia_semana_django = (dia_semana_py + 2) % 7
            if dia_semana_django == 0: dia_semana_django = 7

            jornada_do_dia = jornadas.filter(dia_da_semana=dia_semana_django).first()

            if not jornada_do_dia or not jornada_do_dia.hora_inicio or not jornada_do_dia.hora_fim:
                data_atual += timedelta(days=1)
                continue

            intervalo_minutos = 15
            horarios_possiveis = []
            try:
                 hora_corrente_dt = datetime.combine(data_atual, jornada_do_dia.hora_inicio)
                 fim_expediente_dt = datetime.combine(data_atual, jornada_do_dia.hora_fim)
                 hora_corrente = timezone.make_aware(hora_corrente_dt)
                 fim_expediente = timezone.make_aware(fim_expediente_dt)
            except ValueError:
                 data_atual += timedelta(days=1)
                 continue 

            while hora_corrente < fim_expediente:
                horarios_possiveis.append(hora_corrente)
                hora_corrente += timedelta(minutes=intervalo_minutos)

            if not horarios_possiveis:
                 data_atual += timedelta(days=1)
                 continue

            inicio_dia_aware = horarios_possiveis[0]
            fim_dia_aware = timezone.make_aware(datetime.combine(data_atual, time.max))

            agendamentos_dia = Agendamento.objects.filter(
                medico=medico, status__in=['Agendado', 'Confirmado', 'Realizado'],
                data_hora_inicio__gte=inicio_dia_aware, data_hora_inicio__lt=fim_dia_aware
            ).values_list('data_hora_inicio', 'data_hora_fim')

            bloqueios_dia = BloqueioAgenda.objects.filter(
                medico=medico, data_fim__gt=inicio_dia_aware, data_inicio__lt=fim_dia_aware
            ).values_list('data_inicio', 'data_fim')

            slots_ocupados = set()
            for inicio, fim in agendamentos_dia:
                 slot = inicio
                 while slot < fim:
                      slots_ocupados.add(slot)
                      slot += timedelta(minutes=intervalo_minutos)

            for inicio, fim in bloqueios_dia:
                 slot = inicio
                 minuto_inicial = (slot.minute // intervalo_minutos) * intervalo_minutos
                 slot = slot.replace(minute=minuto_inicial, second=0, microsecond=0)
                 if inicio > slot: slot += timedelta(minutes=intervalo_minutos)
                 while slot < fim:
                      slots_ocupados.add(slot)
                      slot += timedelta(minutes=intervalo_minutos)

            horarios_disponiveis_formatados = []
            for horario in horarios_possiveis:
                 if horario >= agora and horario not in slots_ocupados:
                      horarios_disponiveis_formatados.append(horario.strftime('%H:%M'))

            if horarios_disponiveis_formatados:
                dias_encontrados.append({
                    "data": data_atual.strftime('%Y-%m-%d'),
                    "horarios_disponiveis": horarios_disponiveis_formatados
                })

            data_atual += timedelta(days=1)

        return dias_encontrados

    except CustomUser.DoesNotExist:
        return []
    except Exception as e:
        logger.error(f"Erro ao buscar horários para médico {medico_id}: {e}", exc_info=True)
        return []


def listar_agendamentos_futuros(cpf):
    """Busca no banco de dados todos os agendamentos futuros de um paciente."""
    try:
        paciente = Paciente.objects.get(cpf=cpf)
        agora = timezone.now()
        
        agendamentos = Agendamento.objects.filter(
            paciente=paciente, data_hora_inicio__gte=agora, status__in=['Agendado', 'Confirmado']
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