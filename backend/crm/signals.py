# backend/crm/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.apps import apps
from django.utils import timezone
from datetime import timedelta

# Importamos o serviço de ações do próprio CRM
from .services import CRMService

# 1. GATILHO: PACIENTE (Gera o Lead no CRM)
@receiver(post_save, sender='pacientes.Paciente')
def criar_lead_crm(sender, instance, created, **kwargs):
    """
    A recepção salvou um paciente novo. Cria o card silenciosamente na F1.
    """
    if created:
        Ciclo = apps.get_model('crm', 'Ciclo')
        Ciclo.objects.create(
            paciente=instance,
            tipo='OUTRO', # Fica genérico até ele agendar algo
            fase_atual='F1', # F1 - Apenas Cadastro
            status='ativo',
            responsavel=instance.medico_responsavel
        )
        print(f"[CRM] Lead criado na F1: {instance.nome_completo}")


# 2. GATILHO: AGENDAMENTO (Movimenta o Funil)
@receiver(post_save, sender='agendamentos.Agendamento')
def atualizar_funil_crm(sender, instance, created, **kwargs):
    """
    Observa os agendamentos de fora. Usa .update() para garantir 
    que NÃO vai reativar regras do financeiro nem causar loop infinito.
    """
    Ciclo = apps.get_model('crm', 'Ciclo')
    Agendamento = apps.get_model('agendamentos', 'Agendamento')
    
    ciclo = instance.ciclo

    # --- PASSO A: GARANTIR QUE O AGENDAMENTO PERTENCE A UM CICLO ---
    if not ciclo:
        # Caça um card deste paciente que esteja "ativo" e ainda no início (F1)
        ciclo = Ciclo.objects.filter(
            paciente=instance.paciente, 
            status='ativo',
            fase_atual='F1'
        ).order_by('-data_inicio').first()

        if not ciclo:
            # Se não achou (ex: paciente antigo fazendo agendamento novo), cria um já em F2
            ciclo = Ciclo.objects.create(
                paciente=instance.paciente,
                tipo='OUTRO',
                fase_atual='F2',
                status='ativo'
            )
        
        # VINCOLA O AGENDAMENTO AO CICLO DE FORMA SILENCIOSA (Sem acionar saves complexos)
        Agendamento.objects.filter(pk=instance.pk).update(ciclo=ciclo)
        instance.ciclo = ciclo # Atualiza o objeto atual em memória

    # --- PASSO B: NOMEAR O CARD BASEADO NO AGENDAMENTO ---
    # Se estava genérico ('OUTRO'), vamos dar o nome da especialidade ou procedimento
    novo_tipo = ciclo.tipo
    if ciclo.tipo == 'OUTRO':
        if instance.tipo_agendamento == 'Consulta' and instance.especialidade:
            novo_tipo = str(instance.especialidade.nome).upper()[:50]
        elif instance.tipo_agendamento == 'Procedimento' and instance.procedimento:
            novo_tipo = str(instance.procedimento.descricao).upper()[:50]
            
        if novo_tipo != ciclo.tipo:
            Ciclo.objects.filter(pk=ciclo.pk).update(tipo=novo_tipo)

    # --- PASSO C: MOVIMENTAR O KANBAN COM BASE NOS SEUS STATUS ---
    # Baseado no seu STATUS_CHOICES: 
    # ['Agendado', 'Confirmado', 'Aguardando', 'Em Atendimento', 'Laudando', 'Realizado', 'Cancelado', 'Não Compareceu']
    
    nova_fase = ciclo.fase_atual

    if instance.status in ['Agendado', 'Confirmado'] and ciclo.fase_atual == 'F1':
        nova_fase = 'F2' # F2 - Conversão/Agendado
        
    elif instance.status in ['Aguardando', 'Em Atendimento', 'Laudando', 'Realizado']:
        # Se chegou na clínica e foi atendido, vai pra Pós-Atendimento
        if ciclo.fase_atual in ['F1', 'F2']:
            nova_fase = 'F3' # F3 - Pós-Atendimento
            
            # Se FINALIZOU, agenda tarefa automática para a recepção ligar
            if instance.status == 'Realizado':
                CRMService.criar_acao(
                    ciclo=ciclo,
                    descricao=f"Pós-atendimento: Saber como foi o(a) {instance.tipo_agendamento}",
                    data_alvo=timezone.now().date() + timedelta(days=2)
                )

    # Aplica a mudança de fase silenciosamente no CRM
    if nova_fase != ciclo.fase_atual:
        Ciclo.objects.filter(pk=ciclo.pk).update(fase_atual=nova_fase)
        print(f"[CRM] Card de {instance.paciente.nome_completo} movido para {nova_fase}")


# 3. GATILHO: EXAMES (Move para a Retenção)
@receiver(post_save, sender='exames.Exame')
def acionar_crm_exame(sender, instance, created, **kwargs):
    if instance.ciclo and instance.ciclo.fase_atual in ['F1', 'F2', 'F3']:
        Ciclo = apps.get_model('crm', 'Ciclo')
        Ciclo.objects.filter(pk=instance.ciclo.pk).update(fase_atual='F4')