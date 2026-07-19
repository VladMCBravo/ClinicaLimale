# backend/agendamentos/signals.py

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Agendamento

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Agendamento)
def gerenciar_financeiro_automatico(sender, instance, created, **kwargs):
    """
    Sempre que um Agendamento for salvo no banco, este gatilho é disparado.
    - Se NOVO (created = True), aciona a criação do financeiro.
    - Se ATUALIZADO (created = False) e o status for Cancelado, cancela o financeiro.
    """
    if created:
        try:
            # BLINDAGEM: Verifica se, por acaso, já não existe um pagamento atrelado
            # (Útil caso o React envie o agendamento e o pagamento juntos na mesma requisição)
            if hasattr(instance, 'pagamento') and instance.pagamento is not None:
                return

            # Importamos aqui dentro para evitar dependência circular de carregamento
            from agendamentos.services import criar_agendamento_e_pagamento_pendente

            # Aciona o motor financeiro centralizado
            criar_agendamento_e_pagamento_pendente(
                agendamento_instance=instance,
                usuario_logado=None
            )
            logger.info(f"Financeiro gerado com sucesso via Signal para o Agendamento {instance.id}")
            
        except Exception as e:
            # O erro é apenas logado. Não queremos que uma falha ao gerar o
            # financeiro impeça o paciente de ser agendado.
            logger.error(f"Erro ao gerar financeiro via Signal para Agendamento {instance.id}: {e}", exc_info=True)

    else:
        # === NOVA LÓGICA DE CANCELAMENTO (BLINDADA) ===
        try:
            # 1. Mapeamos todos os status que representam quebra de funil
            # (precisam bater com Agendamento.STATUS_CHOICES)
            status_cancelamento = ['Cancelado', 'Não Compareceu']
            
            if instance.status in status_cancelamento:
                
                # Checa se existe um pagamento atrelado a esse agendamento
                if hasattr(instance, 'pagamento') and instance.pagamento is not None:
                    pagamento = instance.pagamento
                    
                    # 2. 🛡️ TRAVA DE SEGURANÇA FINANCEIRA: 
                    # Só cancelamos a cobrança se o paciente AINDA NÃO PAGOU.
                    # Se já estiver 'Pago', não faz nada (exige estorno manual da recepção).
                    if pagamento.status == 'Pendente':
                        pagamento.status = 'Cancelado'
                        pagamento.save()
                        logger.info(f"Pagamento {pagamento.id} anulado. Agendamento {instance.id} mudou para '{instance.status}'.")
                        
        except Exception as e:
            logger.error(f"Erro ao cancelar financeiro via Signal para o Agendamento {instance.id}: {e}", exc_info=True)