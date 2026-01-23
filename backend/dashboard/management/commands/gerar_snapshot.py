from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Sum, Count
from crm.models import Ciclo
from faturamento.models import Pagamento
from agendamentos.models import Agendamento
from dashboard.models import SnapshotDiario

class Command(BaseCommand):
    help = 'Gera o snapshot diário dos números da clínica'

    def handle(self, *args, **kwargs):
        hoje = timezone.now().date()
        
        # Evita duplicidade no mesmo dia
        if SnapshotDiario.objects.filter(data=hoje).exists():
            self.stdout.write(self.style.WARNING(f'Snapshot para {hoje} já existe.'))
            return

        # Coleta dados
        receita = Pagamento.objects.filter(data_pagamento__date=hoje, status='Pago').aggregate(s=Sum('valor'))['s'] or 0
        agendados = Agendamento.objects.filter(data_hora_inicio__date=hoje).count()
        compareceram = Agendamento.objects.filter(data_hora_inicio__date=hoje, status='Realizado').count()
        
        # Salva
        SnapshotDiario.objects.create(
            receita_do_dia=receita,
            total_agendados=agendados,
            total_compareceram=compareceram,
            # Adicionar lógica de funil se necessário
        )
        
        self.stdout.write(self.style.SUCCESS(f'Snapshot gerado com sucesso para {hoje}'))