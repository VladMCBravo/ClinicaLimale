# backend/crm/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.apps import apps
from .services import CRMService

# Usamos strings ou get_model para referenciar models de outros apps
Agendamento = apps.get_model('agendamentos', 'Agendamento')
Pagamento = apps.get_model('faturamento', 'Pagamento')
Exame = apps.get_model('exames', 'Exame')

@receiver(post_save, sender=Agendamento)
def acionar_crm_agendamento(sender, instance, created, **kwargs):
    """Sempre que um agendamento muda, avisa o CRM."""
    CRMService.processar_gatilho_agendamento(instance, criado=created)

@receiver(post_save, sender=Pagamento)
def atualizar_financeiro_crm(sender, instance, **kwargs):
    """Sempre que pinga dinheiro, atualiza o LTV do ciclo."""
    if instance.status == 'Pago' and instance.agendamento and instance.agendamento.ciclo:
        CRMService.atualizar_ltv(instance.agendamento.ciclo)

# --- NOVO SIGNAL: Quando um exame sobe ---
@receiver(post_save, sender=Exame)
def acionar_crm_exame(sender, instance, created, **kwargs):
    """
    Se um exame for vinculado a um ciclo, atualiza a fase e o status.
    """
    if instance.ciclo:
        print(f"[CRM] Exame recebido para o Ciclo {instance.ciclo.id}")
        
        # Regra: Se fez exame, move para F3 (Pós-Exame) automaticamente
        # (A menos que já esteja em F4)
        if instance.ciclo.fase_atual in ['F1', 'F2']:
            instance.ciclo.fase_atual = 'F3'
            instance.ciclo.save()
            print(f"[CRM] Ciclo movido para F3 via Upload de Exame.")