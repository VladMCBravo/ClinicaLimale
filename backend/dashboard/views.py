# backend/dashboard/views.py - VERSÃO FINAL E CORRIGIDA

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.db.models.functions import Extract
from datetime import timedelta

from agendamentos.models import Agendamento
from faturamento.models import Despesa, Pagamento
from pacientes.models import Paciente
from pacientes.serializers import PacienteSerializer

class DashboardDataAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        hoje = timezone.now().date()
        data_limite = hoje + timedelta(days=7)
        start_of_month = hoje.replace(day=1)

        # --- DADOS GERAIS (sem alterações) ---
        agendamentos_hoje_count = Agendamento.objects.filter(data_hora_inicio__date=hoje).count()
        
        # Lógica de aniversariantes (sem alterações)
        pacientes = Paciente.objects.annotate(dia_do_ano=Extract('data_nascimento', 'doy'))
        hoje_doy = hoje.timetuple().tm_yday
        limite_doy = data_limite.timetuple().tm_yday
        aniversariantes_qs = pacientes.filter(Q(dia_do_ano__gte=hoje_doy) & Q(dia_do_ano__lte=limite_doy)) if hoje_doy <= limite_doy else pacientes.filter(Q(dia_do_ano__gte=hoje_doy) | Q(dia_do_ano__lte=limite_doy))
        aniversariantes = PacienteSerializer(aniversariantes_qs.order_by('dia_do_ano')[:5], many=True).data

        data = {
            'agendamentos_hoje_count': agendamentos_hoje_count,
            'aniversariantes_semana': aniversariantes,
        }

        # --- DADOS FINANCEIROS (COM CORREÇÃO) ---
        if request.user.cargo == 'admin':
            receitas_mes = Pagamento.objects.filter(data_pagamento__gte=start_of_month, status='Pago').aggregate(Sum('valor'))['valor__sum'] or 0
            despesas_mes = Despesa.objects.filter(data_despesa__gte=start_of_month).aggregate(Sum('valor'))['valor__sum'] or 0

            # --- CORREÇÃO PRINCIPAL ESTÁ AQUI ---
            # A consulta agora usa o caminho correto para encontrar o nome do convénio
            convenios_mais_usados = Agendamento.objects.filter(
                tipo_atendimento='Convenio',
                plano_utilizado__isnull=False
            ).values(
                'plano_utilizado__convenio__nome' # <-- O caminho correto
            ).annotate(
                total=Count('id')
            ).order_by('-total')[:5]

            data['dados_financeiros'] = {
                'receitas_mes': receitas_mes,
                'despesas_mes': despesas_mes,
                'convenios_mais_usados': list(convenios_mais_usados)
            }

        return Response(data)