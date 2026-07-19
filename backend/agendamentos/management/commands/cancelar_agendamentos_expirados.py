# agendamentos/management/commands/cancelar_agendamentos_expirados.py - VERSÃO COM LOGS

from django.core.management.base import BaseCommand
from django.utils import timezone
from agendamentos.models import Agendamento
import logging

# Configura um logger para podermos ver a execução nos logs do Render
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Cancela agendamentos com status "Agendado" cujo prazo de pagamento expirou.'

    def handle(self, *args, **options):
        agora_utc = timezone.now()
        
        # Usamos logger.info para que apareça nos logs do Render
        logger.info(f"[ROBO FAXINEIRO] Executando verificação de agendamentos expirados.")
        logger.info(f"[ROBO FAXINEIRO] Horário atual do servidor (UTC): {agora_utc}")

        # Busca por agendamentos que estão pendentes E cujo prazo já passou
        agendamentos_expirados = Agendamento.objects.filter(
            status='Agendado',
            expira_em__isnull=False, # Garante que só pegamos agendamentos que têm um prazo
            expira_em__lte=agora_utc
        )

        # IMPORTANTE: cancelamos um por um com .save() em vez de um .update() em massa.
        # QuerySet.update() não dispara os signals do Django — e são os signals que
        # cancelam o Pagamento 'Pendente' atrelado e avisam o CRM para entrar em
        # recuperação (fase F5). Um .update() em massa deixava cobranças fantasma
        # penduradas e o funil de recuperação nunca era acionado.
        total_cancelados = 0
        for agendamento in agendamentos_expirados:
            agendamento.status = 'Cancelado'
            agendamento.save(update_fields=['status', 'data_atualizacao'])
            total_cancelados += 1

        if total_cancelados > 0:
            msg = f"SUCESSO: {total_cancelados} agendamento(s) foram cancelados."
            logger.info(f"[ROBO FAXINEIRO] {msg}")
            return msg # Retorna a mensagem para o N8N
        else:
            # Se nada foi cancelado, vamos investigar o porquê
            agendamentos_pendentes = Agendamento.objects.filter(status='Agendado', expira_em__isnull=False)
            msg = f"Nenhum agendamento expirado encontrado. {agendamentos_pendentes.count()} agendamento(s) pendente(s) aguardando expiração."
            logger.info(f"[ROBO FAXINEIRO] {msg}")
            
            # Log de depuração para cada agendamento pendente
            for ag in agendamentos_pendentes:
                logger.info(f"[ROBO FAXINEIRO] DEBUG: Agendamento ID {ag.id} tem prazo em (UTC): {ag.expira_em}")
            
            return msg # Retorna a mensagem para o N8N