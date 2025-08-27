# backend/dashboard/views.py - VERSÃO COM LÓGICA DE PERFIL (ADMIN vs RECEPÇÃO)

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
        user = request.user
        hoje = timezone.now().date()
        start_of_month = hoje.replace(day=1)
        
        # --- CÁLCULOS DE KPIs ---
        # Mantivemos os cálculos que você já tinha e adicionamos os novos que planejamos.

        # KPIs Operacionais (para ambos os perfis)
        agendamentos_hoje_count = Agendamento.objects.filter(data_hora_inicio__date=hoje).count()
        pacientes_novos_mes_count = Paciente.objects.filter(
            data_cadastro__gte=start_of_month
        ).count()
        
        # Lógica de aniversariantes (sua lógica original, mantida)
        data_limite_aniversario = hoje + timedelta(days=30) # Aumentei para aniversariantes do mês
        pacientes = Paciente.objects.annotate(dia_do_ano=Extract('data_nascimento', 'doy'))
        hoje_doy = hoje.timetuple().tm_yday
        limite_doy = data_limite_aniversario.timetuple().tm_yday
        aniversariantes_qs = pacientes.filter(Q(dia_do_ano__gte=hoje_doy) & Q(dia_do_ano__lte=limite_doy)) if hoje_doy <= limite_doy else pacientes.filter(Q(dia_do_ano__gte=hoje_doy) | Q(dia_do_ano__lte=limite_doy))
        aniversariantes = PacienteSerializer(aniversariantes_qs.order_by('dia_do_ano')[:5], many=True).data

        # KPI específico da Recepção
        consultas_a_confirmar_count = Agendamento.objects.filter(status='Agendado').count()


        # --- MONTAGEM DA RESPOSTA FINAL BASEADA NO PERFIL ---
        data = {} # Dicionário final

        if user.cargo == 'admin':
            # Admin vê tudo: operacional + financeiro
            
            # Seus cálculos financeiros, 100% preservados
            receitas_mes = Pagamento.objects.filter(data_pagamento__gte=start_of_month, status='Pago').aggregate(Sum('valor'))['valor__sum'] or 0
            despesas_mes = Despesa.objects.filter(data_despesa__gte=start_of_month).aggregate(Sum('valor'))['valor__sum'] or 0
            convenios_mais_usados = Agendamento.objects.filter(
                tipo_atendimento='Convenio', plano_utilizado__isnull=False
            ).values('plano_utilizado__convenio__nome').annotate(total=Count('id')).order_by('-total')[:5]

            data = {
                'agendamentos_hoje_count': agendamentos_hoje_count,
                'pacientes_novos_mes_count': pacientes_novos_mes_count,
                'aniversariantes_mes': aniversariantes,
                'receitas_mes': receitas_mes,
                'despesas_mes': despesas_mes,
                'lucro_liquido_mes': receitas_mes - despesas_mes, # NOVO: KPI de lucro
                'convenios_mais_usados': list(convenios_mais_usados),
            }

        elif user.cargo == 'recepcao':
            # Recepção vê apenas dados operacionais
            data = {
                'agendamentos_hoje_count': agendamentos_hoje_count,
                'pacientes_novos_mes_count': pacientes_novos_mes_count,
                'consultas_a_confirmar_count': consultas_a_confirmar_count,
                'aniversariantes_mes': aniversariantes,
            }
        
        # Médicos ou outros perfis podem ter um dashboard futuro aqui
        # elif user.cargo == 'medico':
        #     data = { ... }

        return Response(data)