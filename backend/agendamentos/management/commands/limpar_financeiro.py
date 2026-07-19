from django.core.management.base import BaseCommand
from agendamentos.models import Agendamento
from django.db import transaction

class Command(BaseCommand):
    help = 'Sincroniza pagamentos pendentes de agendamentos antigos que foram cancelados ou tiveram falta.'

    def handle(self, *args, **kwargs):
        status_quebra = ['Cancelado', 'Não Compareceu']  # precisam bater com Agendamento.STATUS_CHOICES
        
        # Busca todos os agendamentos antigos que deram errado
        agendamentos_perdidos = Agendamento.objects.filter(status__in=status_quebra)
        
        total_analisado = agendamentos_perdidos.count()
        total_corrigido = 0

        self.stdout.write(self.style.WARNING(f"Iniciando varredura em {total_analisado} agendamentos com quebra de funil..."))

        # Usamos transaction.atomic para garantir que se der erro, nada é salvo pela metade
        with transaction.atomic():
            for agendamento in agendamentos_perdidos:
                # Verifica se o agendamento tem financeiro atrelado e se ele ainda está como Pendente
                if hasattr(agendamento, 'pagamento') and agendamento.pagamento is not None:
                    pagamento = agendamento.pagamento
                    
                    if pagamento.status == 'Pendente':
                        pagamento.status = 'Cancelado'
                        pagamento.save()
                        total_corrigido += 1
                        self.stdout.write(self.style.SUCCESS(f"Corrigido: Agendamento {agendamento.id} -> Pagamento {pagamento.id} anulado."))

        self.stdout.write(self.style.SUCCESS(f"\n--- LIMPEZA CONCLUÍDA ---"))
        self.stdout.write(self.style.SUCCESS(f"Total analisado: {total_analisado}"))
        self.stdout.write(self.style.SUCCESS(f"Títulos 'Pendentes' cancelados: {total_corrigido}"))