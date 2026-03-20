# backend/agendamentos/signals.py

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Agendamento

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Agendamento)
def gerar_financeiro_automatico(sender, instance, created, **kwargs):
    """
    Sempre que um Agendamento for salvo no banco, este gatilho é disparado.
    Se for um agendamento NOVO (created = True), aciona o financeiro.
    """
    if created:
        try:
            # BLINDAGEM: Verifica se, por acaso, já não existe um pagamento atrelado
            # (Útil caso o React envie o agendamento e o pagamento juntos na mesma requisição)
            if hasattr(instance, 'pagamento') and instance.pagamento is not None:
                return

            # Descobre se a origem foi o robô pelo texto das observações
            obs = instance.observacoes or ""
            is_bot = "Bot WhatsApp" in obs
            
            # Importamos aqui dentro para evitar dependência circular de carregamento
            from agendamentos.services import criar_agendamento_e_pagamento_pendente
            
            # Aciona o motor financeiro centralizado
            criar_agendamento_e_pagamento_pendente(
                agendamento_instance=instance, 
                usuario_logado=None, 
                initiated_by_chatbot=is_bot
            )
            logger.info(f"Financeiro gerado com sucesso via Signal para o Agendamento {instance.id}")
            
        except Exception as e:
            # O erro é apenas logado. Não queremos que um erro no banco Inter 
            # impeça o paciente de ser agendado.
            logger.error(f"Erro ao gerar financeiro via Signal para Agendamento {instance.id}: {e}", exc_info=True)