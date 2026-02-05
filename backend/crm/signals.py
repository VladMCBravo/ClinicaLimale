# backend/crm/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.apps import apps
from .services import CRMService

# Usamos strings ou get_model para referenciar models de outros apps
Agendamento = apps.get_model('agendamentos', 'Agendamento')
Pagamento = apps.get_model('faturamento', 'Pagamento')

@receiver(post_save, sender=Agendamento)
def acionar_crm_agendamento(sender, instance, created, **kwargs):
    """
    Sempre que um agendamento muda, avisa o CRM.
    """
    CRMService.processar_gatilho_agendamento(instance, criado=created)

@receiver(post_save, sender=Pagamento)
def atualizar_financeiro_crm(sender, instance, **kwargs):
    """
    Sempre que pinga dinheiro, atualiza o LTV do ciclo.
    """
    if instance.status == 'Pago' and instance.agendamento and instance.agendamento.ciclo:
        # Só recalcula se tiver vínculo com ciclo
        CRMService.atualizar_ltv(instance.agendamento.ciclo)