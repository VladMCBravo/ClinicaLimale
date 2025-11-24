# backend/agendamentos/services.py - VERSÃO FINAL E CORRETA

import logging 
from django.utils import timezone
from datetime import date,datetime,timedelta,time
from django.utils import timezone
from dateutil.parser import parse
from django.db.models import Q # Necessário para bloqueios
from .models import Agendamento, Sala
from usuarios.models import CustomUser, JornadaDeTrabalho
from agendamentos.models import Agendamento, BloqueioAgenda
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

def buscar_proximo_horario_procedimento(procedimento_id: int):
    """
    Busca horários livres na SALA DE PROCEDIMENTOS (Dinâmica).
    """
    try:
        # --- CORREÇÃO: Busca dinâmica da sala ---
        # Pega a primeira sala marcada como 'e_sala_exame' ou qualquer uma disponível
        sala_procedimentos = Sala.objects.filter(e_sala_exame=True).first()
        
        if not sala_procedimentos:
            sala_procedimentos = Sala.objects.first()
            if not sala_procedimentos:
                logger.warning("Nenhuma sala cadastrada para buscar horários.")
                return None

        jornada_sala = {'hora_inicio': time(8, 0), 'hora_fim': time(18, 0)}
        agora = timezone.localtime(timezone.now())

        for i in range(90): 
            data_atual = agora.date() + timedelta(days=i)
            if data_atual.weekday() == 6: continue # Ignora domingos
            
            horarios_disponiveis = []
            slot_atual = datetime.combine(data_atual, jornada_sala['hora_inicio'])

            while slot_atual.time() < jornada_sala['hora_fim']:
                if timezone.make_aware(slot_atual) > agora:
                    conflito_sala = Agendamento.objects.filter(
                        sala=sala_procedimentos,
                        status__in=['Agendado', 'Confirmado', 'Realizado'],
                        data_hora_inicio__lt=timezone.make_aware(slot_atual + timedelta(minutes=50)),
                        data_hora_fim__gt=timezone.make_aware(slot_atual)
                    ).exists()
                    
                    if not conflito_sala:
                        horarios_disponiveis.append(slot_atual.strftime('%H:%M'))

                slot_atual += timedelta(minutes=30)

            if horarios_disponiveis:
                return {
                    "data": data_atual.strftime('%Y-%m-%d'),
                    "horarios_disponiveis": horarios_disponiveis
                }
        return None

    except Exception as e:
        logger.error(f"Erro ao buscar horários para procedimento: {e}", exc_info=True)
        return None

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

def buscar_proximo_horario_disponivel(medico_id: int, data_inicial: date = None) -> dict:
    """
    Busca o próximo dia útil com horários disponíveis para um médico,
    a partir de uma data inicial (ou de hoje se não especificada).
    Verifica Jornada, Agendamentos e Bloqueios.
    Retorna um dicionário com a data e a lista de horários, ou {} se não encontrar.
    """
    try:
        medico = CustomUser.objects.get(id=medico_id, cargo='medico', is_active=True) # Garante que está ativo
        jornadas = JornadaDeTrabalho.objects.filter(medico=medico).order_by('dia_da_semana')
        if not jornadas.exists():
            logger.warning(f"Médico {medico_id} não possui jornada de trabalho cadastrada.")
            return {} # Retorna vazio se não tem jornada

        agora = timezone.localtime(timezone.now())

        # Define a data de início da busca
        if data_inicial:
             # Garante que data_inicial seja um objeto date e não seja no passado
             if isinstance(data_inicial, datetime): inicio_busca = data_inicial.date()
             elif isinstance(data_inicial, date): inicio_busca = data_inicial
             else:
                  try: inicio_busca = parse(str(data_inicial)).date()
                  except: inicio_busca = agora.date() # Fallback para hoje
             # Garante que a busca não comece antes de hoje
             inicio_busca = max(inicio_busca, agora.date())
        else:
            inicio_busca = agora.date() # Início padrão: HOJE

        limite_busca = inicio_busca + timedelta(days=90)
        data_atual = inicio_busca

        while data_atual <= limite_busca:
            dia_semana_py = data_atual.weekday() # Segunda=0, Domingo=6

            # MANTÉM A SUA LÓGICA DE CONVERSÃO para o padrão Django
            dia_semana_django = (dia_semana_py + 2) % 7
            if dia_semana_django == 0: dia_semana_django = 7

            jornada_do_dia = jornadas.filter(dia_da_semana=dia_semana_django).first()

            # Pula se não trabalha no dia OU se os horários não estão definidos
            if not jornada_do_dia or not jornada_do_dia.hora_inicio or not jornada_do_dia.hora_fim:
                data_atual += timedelta(days=1)
                continue

            # Gera horários possíveis (a cada 30 min)
            intervalo_minutos = 30
            horarios_possiveis = []
            try:
                 hora_corrente_dt = datetime.combine(data_atual, jornada_do_dia.hora_inicio)
                 fim_expediente_dt = datetime.combine(data_atual, jornada_do_dia.hora_fim)
                 # Garante que os horários sejam conscientes do fuso horário
                 hora_corrente = timezone.make_aware(hora_corrente_dt)
                 fim_expediente = timezone.make_aware(fim_expediente_dt)
            except ValueError: # Caso hora_inicio/hora_fim sejam inválidos no DB
                 logger.error(f"Horário inválido na jornada do médico {medico_id} para data {data_atual}")
                 data_atual += timedelta(days=1)
                 continue # Pula este dia

            while hora_corrente < fim_expediente:
                horarios_possiveis.append(hora_corrente)
                hora_corrente += timedelta(minutes=intervalo_minutos)

            if not horarios_possiveis: # Se não gerou horários (ex: fim < inicio)
                 data_atual += timedelta(days=1)
                 continue

            # Busca agendamentos E bloqueios para otimizar a consulta ao DB
            inicio_dia_aware = horarios_possiveis[0]
            fim_dia_aware = timezone.make_aware(datetime.combine(data_atual, time.max)) # Fim do dia aware

            agendamentos_dia = Agendamento.objects.filter(
                medico=medico,
                status__in=['Agendado', 'Confirmado', 'Realizado'],
                data_hora_inicio__gte=inicio_dia_aware, # Otimiza: só busca a partir do início do expediente
                data_hora_inicio__lt=fim_dia_aware     # Otimiza: só busca até o fim do dia
            ).values_list('data_hora_inicio', 'data_hora_fim') # Pega início e fim

            bloqueios_dia = BloqueioAgenda.objects.filter(
                medico=medico,
                data_fim__gt=inicio_dia_aware, # O bloqueio termina depois do início do expediente
                data_inicio__lt=fim_dia_aware  # O bloqueio começa antes do fim do dia
            ).values_list('data_inicio', 'data_fim')

            # Cria um conjunto de slots ocupados (considerando duração de 50 min para agendamentos)
            slots_ocupados = set()
            duracao_consulta = timedelta(minutes=50) # Duração padrão
            # Adiciona slots ocupados por agendamentos
            for inicio, fim in agendamentos_dia:
                 slot = inicio
                 # Adiciona o slot de início e slots intermediários se a duração for maior que o intervalo
                 while slot < fim:
                      slots_ocupados.add(slot)
                      slot += timedelta(minutes=intervalo_minutos) # Marca todos os intervalos que o agendamento cobre

            # Adiciona slots ocupados por bloqueios
            for inicio, fim in bloqueios_dia:
                 slot = inicio
                 # Garante que o slot inicial esteja alinhado com nossos intervalos (opcional, mas seguro)
                 minuto_inicial = (slot.minute // intervalo_minutos) * intervalo_minutos
                 slot = slot.replace(minute=minuto_inicial, second=0, microsecond=0)
                 # Ajusta para o próximo slot se o início do bloqueio for depois do início do slot
                 if inicio > slot: slot += timedelta(minutes=intervalo_minutos)

                 while slot < fim:
                      slots_ocupados.add(slot)
                      slot += timedelta(minutes=intervalo_minutos)

            # Filtra horários disponíveis
            horarios_disponiveis_formatados = []
            for horario in horarios_possiveis:
                 # Verifica se o horário é futuro E não está ocupado
                 if horario >= agora and horario not in slots_ocupados:
                      horarios_disponiveis_formatados.append(horario.strftime('%H:%M'))

            if horarios_disponiveis_formatados:
                return {
                    "data": data_atual.strftime('%Y-%m-%d'),
                    "horarios_disponiveis": horarios_disponiveis_formatados
                }

            # Se não encontrou, tenta o próximo dia
            data_atual += timedelta(days=1)

        # Se saiu do loop sem encontrar nada
        logger.warning(f"Nenhum horário encontrado para médico {medico_id} nos próximos 90 dias a partir de {inicio_busca}.")
        return {} # Retorna dicionário vazio

    except CustomUser.DoesNotExist:
        logger.error(f"Médico com id={medico_id} não encontrado.")
        return {}
    except Exception as e:
        logger.error(f"Erro ao buscar horários para médico {medico_id}: {e}", exc_info=True)
        return {}
    # --- FIM DA VERSÃO FINAL ---


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