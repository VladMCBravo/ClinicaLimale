# backend/crm/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.apps import apps
from django.utils import timezone
from datetime import timedelta
from .services import CRMService

# 1. GATILHO: PACIENTE (Gera o Lead no CRM)
@receiver(post_save, sender='pacientes.Paciente')
def criar_lead_crm(sender, instance, created, **kwargs):
    if created:
        Ciclo = apps.get_model('crm', 'Ciclo')
        Ciclo.objects.create(
            paciente=instance,
            tipo='OUTRO', 
            fase_atual='F1', # F1 - Apenas Cadastro
            status='ativo',
            responsavel=instance.medico_responsavel
        )
        print(f"[CRM] Lead criado na F1: {instance.nome_completo}")


# =========================================================
# GATILHO 2: AGENDAMENTO (Movimenta o Funil e Detecta Retorno)
# =========================================================
@receiver(post_save, sender='agendamentos.Agendamento')
def atualizar_funil_crm(sender, instance, created, **kwargs):
    Ciclo = apps.get_model('crm', 'Ciclo')
    Agendamento = apps.get_model('agendamentos', 'Agendamento')
    
    ciclo = instance.ciclo

    # Garante a existência do Ciclo (Lead)
    if not ciclo:
        ciclo = Ciclo.objects.filter(
            paciente=instance.paciente, status='ativo'
        ).exclude(fase_atual='ENCERRADO').order_by('-data_inicio').first()

        if not ciclo:
            ciclo = Ciclo.objects.create(paciente=instance.paciente, tipo='OUTRO', fase_atual='F2', status='ativo')
        
        Agendamento.objects.filter(pk=instance.pk).update(ciclo=ciclo)
        instance.ciclo = ciclo 

    # Atualiza Especialidade/Procedimento no Card
    novo_tipo = ciclo.tipo
    if instance.tipo_agendamento == 'Consulta' and instance.especialidade:
        novo_tipo = str(instance.especialidade.nome).upper()[:20]
    elif instance.tipo_agendamento == 'Procedimento' and instance.procedimento:
        novo_tipo = str(instance.procedimento.descricao).upper()[:20]

    # -------------------------------------------------------------
    # A SUA LÓGICA DE RETORNO (VERIFICA O PASSADO)
    # -------------------------------------------------------------
    # O banco busca se existe algum agendamento 'Realizado' antes da data atual
    teve_sucesso_anterior = Agendamento.objects.filter(
        paciente=instance.paciente,
        status='Realizado',
        data_hora_inicio__lt=instance.data_hora_inicio
    ).exclude(id=instance.id).exists()

    # Se teve sucesso antes, classifica silenciosamente como "Retorno"
    if teve_sucesso_anterior and instance.tipo_visita != 'Retorno':
        Agendamento.objects.filter(id=instance.id).update(tipo_visita='Retorno')
        instance.tipo_visita = 'Retorno'
    # Se não teve, ou se o passado foi só "Não Compareceu/Cancelado", é Primeira Consulta
    elif not teve_sucesso_anterior and instance.tipo_visita != 'Primeira Consulta':
        Agendamento.objects.filter(id=instance.id).update(tipo_visita='Primeira Consulta')
        instance.tipo_visita = 'Primeira Consulta'

    # -------------------------------------------------------------
    # MOVIMENTAÇÃO DO KANBAN
    # -------------------------------------------------------------
    nova_fase = ciclo.fase_atual

    if instance.status in ['Agendado', 'Confirmado']:
        if teve_sucesso_anterior:
            nova_fase = 'F4' # É Retorno! Vai pra F4 (LTV)
        else:
            nova_fase = 'F2' # Primeira Viagem. Vai pra F2 (Conversão)

    elif instance.status in ['Aguardando', 'Em Atendimento', 'Laudando', 'Realizado']:
        nova_fase = 'F3' # Pós-Atendimento
        
        if instance.status == 'Realizado':
            CRMService.criar_acao(
                ciclo=ciclo,
                descricao=f"Pós-atendimento ({instance.tipo_visita})",
                data_alvo=timezone.now().date() + timedelta(days=2)
            )

    elif instance.status in ['Cancelado', 'Não Compareceu']:
        nova_fase = 'F5' # Recuperação

    # Aplica as mudanças no CRM
    if nova_fase != ciclo.fase_atual or novo_tipo != ciclo.tipo:
        Ciclo.objects.filter(id=ciclo.id).update(fase_atual=nova_fase, tipo=novo_tipo)


# 3. GATILHO: EXAMES (Move para Pós-Atendimento)
@receiver(post_save, sender='exames.Exame')
def acionar_crm_exame(sender, instance, created, **kwargs):
    # Se o laudo/exame for anexado, o paciente vai para a F3 para a equipe avisar.
    if instance.ciclo and instance.ciclo.fase_atual in ['F1', 'F2']:
        Ciclo = apps.get_model('crm', 'Ciclo')
        Ciclo.objects.filter(pk=instance.ciclo.pk).update(fase_atual='F3')