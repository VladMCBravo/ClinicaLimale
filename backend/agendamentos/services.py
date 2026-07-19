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
            # ---> ADICIONE ESTA LINHA <---
            logger.warning(f"SALA NÃO ENCONTRADA: O exame exige a tag '{config_exame.equipamento_obrigatorio}', mas nenhuma sala de exame possui essa tag.")
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


def criar_agendamento_e_pagamento_pendente(agendamento_instance, usuario_logado):
    agendamento = agendamento_instance

    # =========================================================================
    # TRAVA DE IMUTABILIDADE HISTÓRICA
    # Se o agendamento já tem um pagamento atrelado, não tocamos mais nele.
    # O passado está protegido. Apenas retornamos a instância como está.
    # =========================================================================
    if hasattr(agendamento, 'pagamento') and agendamento.pagamento is not None:
        return agendamento

    valor_do_pagamento = 0.00
    
    # --- NOVA LÓGICA DO VALOR DO CONVÊNIO ---
    if agendamento.tipo_atendimento == 'Convenio' and agendamento.plano_utilizado:
        if agendamento.tipo_agendamento == 'Consulta' and agendamento.especialidade:
            from usuarios.models import ValorEspecialidadeConvenio
            val_obj = ValorEspecialidadeConvenio.objects.filter(
                especialidade=agendamento.especialidade, 
                plano_convenio=agendamento.plano_utilizado
            ).first()
            if val_obj: valor_do_pagamento = val_obj.valor
            
        # --- A CORREÇÃO: O 'ELSE' IMPEDE QUE O PARTICULAR SOBRESCREVA O CONVÊNIO ---
    else:
        if agendamento.tipo_agendamento == 'Consulta':
            if agendamento.especialidade and agendamento.especialidade.valor_consulta:
                valor_do_pagamento = agendamento.especialidade.valor_consulta
        elif agendamento.tipo_agendamento == 'Procedimento':
            if agendamento.procedimento and agendamento.procedimento.valor_particular:
                valor_do_pagamento = agendamento.procedimento.valor_particular
    
    Pagamento.objects.create(
        agendamento=agendamento,
        paciente=agendamento.paciente,
        valor=valor_do_pagamento,
        status='Pendente',
        registrado_por=usuario_logado,
        data_vencimento=agendamento.data_hora_inicio.date()
    )

    return agendamento


def buscar_proximo_horario_disponivel(medico_id: int, data_inicial: date = None, limite_dias_retorno=3) -> list:
    """
    Busca os próximos dias úteis com horários disponíveis para um médico.
    """
    try:
        medico = CustomUser.objects.get(id=medico_id, cargo='medico', is_active=True)
        # Traz apenas as jornadas ativas
        jornadas = JornadaDeTrabalho.objects.filter(medico=medico, ativo=True).order_by('dia_da_semana')
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
        
        dias_encontrados = [] 

        while data_atual <= limite_busca:
            if len(dias_encontrados) >= limite_dias_retorno:
                break 

            # --- CORREÇÃO 1: DIA DA SEMANA EXATO ---
            # O Python (0=Segunda) já é idêntico ao DiaSemana do seu Models
            dia_semana_py = data_atual.weekday() 
            
            # --- CORREÇÃO 2: MATEMÁTICA DA SEMANA DO MÊS ---
            semana_do_mes = ((data_atual.day - 1) // 7) + 1

            # Pega TODAS as jornadas cadastradas para este dia da semana
            jornadas_do_dia = jornadas.filter(dia_da_semana=dia_semana_py)

            horarios_possiveis = []
            intervalo_minutos = 15

            for jornada in jornadas_do_dia:
                # Verifica a restrição das semanas (1ª, 2ª, 3ª, etc)
                if jornada.semanas_do_mes and len(jornada.semanas_do_mes) > 0:
                    semanas_validas = [int(s) for s in jornada.semanas_do_mes]
                    if semana_do_mes not in semanas_validas:
                        continue # Pula esta jornada, pois não atende nesta semana do mês

                if not jornada.hora_inicio or not jornada.hora_fim:
                    continue

                try:
                     hora_corrente_dt = datetime.combine(data_atual, jornada.hora_inicio)
                     fim_expediente_dt = datetime.combine(data_atual, jornada.hora_fim)
                     hora_corrente = timezone.make_aware(hora_corrente_dt)
                     fim_expediente = timezone.make_aware(fim_expediente_dt)
                except ValueError:
                     continue 

                # Usa o intervalo cadastrado na jornada
                intervalo = jornada.intervalo_consulta or 15

                while hora_corrente < fim_expediente:
                    # Evita duplicidade se o admin cadastrar jornadas sobrepostas
                    if hora_corrente not in horarios_possiveis:
                        horarios_possiveis.append(hora_corrente)
                    hora_corrente += timedelta(minutes=intervalo)

            if not horarios_possiveis:
                 data_atual += timedelta(days=1)
                 continue

            # Ordena cronologicamente
            horarios_possiveis.sort()

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
        
        # O .save() vai acionar o signals.py automaticamente,
        # que por sua vez vai cancelar o pagamento atrelado.
        agendamento.save() 
            
        return {"status": "sucesso", "mensagem": "Agendamento cancelado com sucesso."}
    except Agendamento.DoesNotExist:
        return {"status": "erro", "mensagem": "Agendamento não encontrado."}