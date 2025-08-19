# backend/dashboard/views.py - VERSÃO CORRIGIDA E EXPANDIDA

from rest_framework.views import APIView
from rest_framework.response import Response
# 1. Altere a permissão para IsAdminUser para restringir o acesso
from rest_framework.permissions import IsAdminUser 
from django.utils import timezone
from django.db.models import Sum

# 2. Importe os modelos necessários de outros apps
from agendamentos.models import Agendamento
from faturamento.models import Despesa, Pagamento


# Vamos manter o nome da sua view, mas expandir a lógica
class DashboardStatsAPIView(APIView):
    permission_classes = [IsAdminUser] # <-- Permissão corrigida

    def get(self, request, *args, **kwargs):
        hoje = timezone.localdate()
        start_of_month = hoje.replace(day=1)

        # --- Lógica que você já tinha ---
        agendamentos_hoje = Agendamento.objects.filter(data_hora_inicio__date=hoje)
        pacientes_de_hoje = [ag.paciente for ag in agendamentos_hoje]

        # --- Lógica expandida com dados financeiros ---
        pendentes_count = Agendamento.objects.filter(pagamento__isnull=True, data_hora_inicio__date__lte=hoje).count()
        receitas_mes = Pagamento.objects.filter(data_pagamento__gte=start_of_month).aggregate(Sum('valor'))['valor__sum'] or 0
        despesas_mes = Despesa.objects.filter(data_despesa__gte=start_of_month).aggregate(Sum('valor'))['valor__sum'] or 0
        
        # --- Resposta completa com todos os dados ---
        data = {
            'agendamentos_hoje_count': agendamentos_hoje.count(),
            'pacientes_hoje': [{'id': p.id, 'nome': p.nome_completo} for p in set(pacientes_de_hoje)],
            'pagamentos_pendentes_count': pendentes_count,
            'resumo_financeiro': {
                'receitas_mes': receitas_mes,
                'despesas_mes': despesas_mes,
            }
        }
        return Response(data)