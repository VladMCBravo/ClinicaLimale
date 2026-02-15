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


# 2. GATILHO: AGENDAMENTO (Movimenta o Funil)
@receiver(post_save, sender='agendamentos.Agendamento')
def atualizar_funil_crm(sender, instance, created, **kwargs):
    Ciclo = apps.get_model('crm', 'Ciclo')
    Agendamento = apps.get_model('agendamentos', 'Agendamento')
    
    ciclo = instance.ciclo

    # --- PASSO A: GARANTIR QUE O AGENDAMENTO PERTENCE A UM CICLO ---
    if not ciclo:
        ciclo = Ciclo.objects.filter(
            paciente=instance.paciente, 
            status='ativo'
        ).exclude(fase_atual='ENCERRADO').order_by('-data_inicio').first()

        if not ciclo:
            ciclo = Ciclo.objects.create(
                paciente=instance.paciente,
                tipo='OUTRO',
                fase_atual='F2',
                status='ativo'
            )
        
        Agendamento.objects.filter(pk=instance.pk).update(ciclo=ciclo)
        instance.ciclo = ciclo 

    # --- PASSO B: NOMEAR O CARD BASEADO NO AGENDAMENTO ---
    novo_tipo = ciclo.tipo
    if ciclo.tipo == 'OUTRO' or ciclo.tipo == 'Consulta':
        if instance.tipo_agendamento == 'Consulta' and instance.especialidade:
            novo_tipo = str(instance.especialidade.nome).upper()[:20]
        elif instance.tipo_agendamento == 'Procedimento' and instance.procedimento:
            novo_tipo = str(instance.procedimento.descricao).upper()[:20]
            
        if novo_tipo != ciclo.tipo:
            Ciclo.objects.filter(pk=ciclo.pk).update(tipo=novo_tipo)

    # --- PASSO C: MOVIMENTAR O KANBAN COM BASE NOS STATUS ---
    nova_fase = ciclo.fase_atual

    # 1. CONVERSÃO: Agendou? Sai da Entrada, da Retenção ou da Recuperação e vai pra F2
    if instance.status in ['Agendado', 'Confirmado'] and ciclo.fase_atual in ['F1', 'F4', 'F5']:
        nova_fase = 'F2'
        
    # 2. NA CLÍNICA: Paciente chegou ou fez o exame. Vai pra F3.
    elif instance.status in ['Aguardando', 'Em Atendimento', 'Laudando', 'Realizado']:
        if ciclo.fase_atual in ['F1', 'F2']:
            nova_fase = 'F3' 
            
            if instance.status == 'Realizado':
                CRMService.criar_acao(
                    ciclo=ciclo,
                    descricao=f"Pós-atendimento: Saber como foi a experiência",
                    data_alvo=timezone.now().date() + timedelta(days=2)
                )

    # 3. RECUPERAÇÃO (A NOVA FASE F5): Faltou ou Desmarcou
    elif instance.status in ['Cancelado', 'Não Compareceu']:
        nova_fase = 'F5'
        
        # Cria uma tarefa automática para a recepção ligar e remarcar HOJE!
        CRMService.criar_acao(
            ciclo=ciclo,
            descricao="Faltou/Cancelou: Ligar agora para tentar remarcar!",
            data_alvo=timezone.now().date()
        )

    # Aplica a mudança de fase silenciosamente
    if nova_fase != ciclo.fase_atual:
        Ciclo.objects.filter(pk=ciclo.pk).update(fase_atual=nova_fase)
        print(f"[CRM] Card de {instance.paciente.nome_completo} movido para {nova_fase}")


# 3. GATILHO: EXAMES (Move para a Retenção)
@receiver(post_save, sender='exames.Exame')
def acionar_crm_exame(sender, instance, created, **kwargs):
    if instance.ciclo and instance.ciclo.fase_atual in ['F1', 'F2', 'F3']:
        Ciclo = apps.get_model('crm', 'Ciclo')
        Ciclo.objects.filter(pk=instance.ciclo.pk).update(fase_atual='F4')