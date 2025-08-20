# backend/dashboard/views.py
from django.utils import timezone
from datetime import timedelta
from django.db.models.functions import Extract
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from pacientes.models import Paciente
from pacientes.serializers import PacienteSerializer


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

class AniversariantesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        hoje = timezone.now()
        data_limite = hoje + timedelta(days=7)

        # Extrai o dia do ano (1 a 366)
        hoje_doy = hoje.timetuple().tm_yday
        limite_doy = data_limite.timetuple().tm_yday

        # Anota (adiciona) o dia do ano de cada paciente ao queryset
        pacientes = Paciente.objects.annotate(
            dia_do_ano=Extract('data_nascimento', 'doy')
        )

        if hoje_doy < limite_doy:
            # Caso normal (não vira o ano)
            aniversariantes = pacientes.filter(dia_do_ano__gte=hoje_doy, dia_do_ano__lte=limite_doy)
        else:
            # Caso especial (a semana vira o ano, ex: 28/12 a 04/01)
            aniversariantes = pacientes.filter(
                models.Q(dia_do_ano__gte=hoje_doy) | models.Q(dia_do_ano__lte=limite_doy)
            )

        serializer = PacienteSerializer(aniversariantes.order_by('dia_do_ano')[:10], many=True) # Limita a 10 resultados
        return Response(serializer.data)
