# backend/agendamentos/services.py - VERSÃO FINAL E CORRETA

import logging 
from django.utils import timezone
from datetime import datetime,timedelta, time
from .models import Agendamento, Sala
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

def buscar_proximo_horario_procedimento(procedimento_id: int):
    """
    <<-- NOVA LÓGICA -->>
    Busca os próximos horários livres especificamente na SALA DE PROCEDIMENTOS.
    Esta função é usada para EXAMES/PROCEDIMENTOS.
    """
    try:
        # Tenta encontrar a sala por um dos nomes comuns.
        # IMPORTANTE: Garanta que o nome no seu banco de dados seja um destes.
        try:
            sala_procedimentos = Sala.objects.get(nome__iexact="Sala 1")
        except Sala.DoesNotExist:
            sala_procedimentos = Sala.objects.get(nome__iexact="Consultório 1")

        # Define uma jornada de trabalho padrão para a sala de procedimentos
        # (Ex: Segunda a Sábado). Ajuste conforme necessário.
        jornada_sala = {'hora_inicio': time(8, 0), 'hora_fim': time(18, 0)}
        agora = timezone.localtime(timezone.now())

        for i in range(90): # Busca nos próximos 90 dias
            data_atual = agora.date() + timedelta(days=i)
            # Ignora Domingos
            if data_atual.weekday() == 6:
                continue
            
            horarios_disponiveis = []
            slot_atual = datetime.combine(data_atual, jornada_sala['hora_inicio'])

            while slot_atual.time() < jornada_sala['hora_fim']:
                if timezone.make_aware(slot_atual) > agora:
                    # Verifica se a SALA tem conflito de agendamento
                    conflito_sala = Agendamento.objects.filter(
                        sala=sala_procedimentos,
                        status__in=['Agendado', 'Confirmado', 'Realizado'],
                        tipo_agendamento='Procedimento',
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

    except Sala.DoesNotExist:
        logger.error("A 'Sala 1' ou 'Consultório 1' não foi encontrada no banco de dados. Não é possível agendar procedimentos.")
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

def buscar_proximo_horario_disponivel(medico_id: int):
    """
    Busca os próximos horários livres para um MÉDICO específico.
    Esta função é usada para CONSULTAS (Presenciais e Telemedicina).
    A lógica verifica apenas a agenda do médico, pois:
    - Para Telemedicina, a sala não importa.
    - Para Presencial, a recepcionista alocará a sala posteriormente.
    """
    try:
        medico = CustomUser.objects.get(id=medico_id, cargo='medico')
        jornadas = JornadaDeTrabalho.objects.filter(medico=medico).order_by('dia_da_semana')
        if not jornadas.exists():
            return None

        agora = timezone.localtime(timezone.now())
        
        for i in range(90): # Busca nos próximos 90 dias
            data_atual = agora.date() + timedelta(days=i)
            dia_semana_py = data_atual.weekday() # Segunda=0, Domingo=6
            
            # Converte para o padrão do Django (Domingo=1, Sábado=7)
            dia_semana_django = (dia_semana_py + 2) % 7
            if dia_semana_django == 0: dia_semana_django = 7

            jornada_do_dia = jornadas.filter(dia_da_semana=dia_semana_django).first()
            if not jornada_do_dia:
                continue

            horarios_disponiveis = []
            hora_inicio = jornada_do_dia.hora_inicio
            hora_fim = jornada_do_dia.hora_fim
            
            slot_atual = datetime.combine(data_atual, hora_inicio)
            
            while slot_atual.time() < hora_fim:
                # O slot só é válido se for no futuro
                if timezone.make_aware(slot_atual) > agora:
                    # Verifica se o MÉDICO tem conflito de agendamento
                    conflito_medico = Agendamento.objects.filter(
                        medico=medico,
                        status__in=['Agendado', 'Confirmado', 'Realizado'],
                        data_hora_inicio__lt=timezone.make_aware(slot_atual + timedelta(minutes=50)),
                        data_hora_fim__gt=timezone.make_aware(slot_atual)
                    ).exists()

                    if not conflito_medico:
                        horarios_disponiveis.append(slot_atual.strftime('%H:%M'))
                
                slot_atual += timedelta(minutes=30) # Próximo slot a cada 30 min

            if horarios_disponiveis:
                return {
                    "data": data_atual.strftime('%Y-%m-%d'),
                    "horarios_disponiveis": horarios_disponiveis
                }
        return None

    except CustomUser.DoesNotExist:
        logger.error(f"Médico com id={medico_id} não encontrado.")
        return None
    except Exception as e:
        logger.error(f"Erro ao buscar horários para médico {medico_id}: {e}", exc_info=True)
        return None


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