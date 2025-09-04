# agendamentos/management/commands/cancelar_agendamentos_expirados.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from agendamentos.models import Agendamento
import logging

# Configura um logger para podermos ver a execução nos logs do Render
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Cancela agendamentos com status "Agendado" cujo prazo de pagamento expirou.'

    def handle(self, *args, **options):
        agora = timezone.now()
        self.stdout.write(f"[{agora.strftime('%Y-%m-%d %H:%M:%S')}] Verificando agendamentos expirados...")

        # Busca por agendamentos que estão pendentes E cujo prazo já passou
        agendamentos_expirados = Agendamento.objects.filter(
            status='Agendado',
            expira_em__lte=agora
        )

        if not agendamentos_expirados.exists():
            self.stdout.write(self.style.SUCCESS("Nenhum agendamento expirado encontrado."))
            return

        total_cancelados = 0
        for agendamento in agendamentos_expirados:
            agendamento.status = 'Cancelado'
            agendamento.save()
            total_cancelados += 1
            logger.info(f"Agendamento ID {agendamento.id} para {agendamento.paciente.nome_completo} foi cancelado por expiração.")

        self.stdout.write(self.style.SUCCESS(f"Sucesso! {total_cancelados} agendamento(s) foram cancelados."))