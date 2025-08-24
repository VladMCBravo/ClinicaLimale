# backend/agendamentos/views.py - VERSÃO CORRIGIDA

from rest_framework import generics, status # <-- 1. Adicione 'status' aqui
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny # <-- 2. Adicione 'AllowAny' aqui
from usuarios.permissions import IsRecepcaoOrAdmin, IsAdminUser
from .models import Agendamento
from .serializers import AgendamentoSerializer, AgendamentoWriteSerializer
from django.utils import timezone
from faturamento.models import Pagamento, Procedimento
import datetime
import os # <-- 3. Adicione a importação do 'os'

class AgendamentoListCreateAPIView(generics.ListCreateAPIView):
    # ... (sem alterações nesta view)
    permission_classes = [IsAuthenticated]
    queryset = Agendamento.objects.all().select_related('paciente').order_by('data_hora_inicio')
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AgendamentoWriteSerializer
        return AgendamentoSerializer
    def perform_create(self, serializer):
        agendamento = serializer.save()
        if agendamento.tipo_atendimento == 'Particular':
            valor_do_pagamento = 0.00
            if agendamento.procedimento:
                valor_do_pagamento = agendamento.procedimento.valor
            Pagamento.objects.create(
                agendamento=agendamento,
                paciente=agendamento.paciente,
                valor=valor_do_pagamento,
                status='Pendente',
                registrado_por=self.request.user
            )

class AgendamentoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    # ... (sem alterações nesta view)
    permission_classes = [IsAuthenticated]
    queryset = Agendamento.objects.all()
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AgendamentoWriteSerializer
        return AgendamentoSerializer

class AgendamentosNaoPagosListAPIView(generics.ListAPIView):
    # ... (sem alterações nesta view)
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def get_queryset(self):
        return Agendamento.objects.filter(pagamento__isnull=True).order_by('data_hora_inicio')

class AgendamentosHojeListView(generics.ListAPIView):
    # ... (sem alterações nesta view)
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        hoje = timezone.localtime(timezone.now()).date()
        return Agendamento.objects.filter(data_hora_inicio__date=hoje).order_by('data_hora_inicio')

# --- VIEW PARA O CRON JOB EXTERNO (AGORA SEM ERROS) ---
class EnviarLembretesCronView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        SECRET_KEY_CRON = os.environ.get('SECRET_KEY_CRON')
        provided_key = request.query_params.get('key')

        # Corrigimos o 'satus' para 'status'
        if not SECRET_KEY_CRON or provided_key != SECRET_KEY_CRON:
            return Response({'detail': 'Acesso não autorizado.'}, status=status.HTTP_401_UNAUTHORIZED)

        agora = timezone.localtime(timezone.now())
        amanha = agora.date() + datetime.timedelta(days=1)
        inicio_de_amanha = timezone.make_aware(datetime.datetime.combine(amanha, datetime.time.min))
        fim_de_amanha = timezone.make_aware(datetime.datetime.combine(amanha, datetime.time.max))

        agendamentos_de_amanha = Agendamento.objects.filter(
            data_hora_inicio__gte=inicio_de_amanha,
            data_hora_inicio__lte=fim_de_amanha,
            status='Confirmado'
        ).select_related('paciente')

        if not agendamentos_de_amanha.exists():
            return Response({'status': 'Nenhum agendamento para amanhã.'})

        total_enviado = 0
        for agendamento in agendamentos_de_amanha:
            if agendamento.paciente.email:
                # Aqui entraria a sua lógica de envio de email (send_mail)
                total_enviado += 1
        
        return Response({'status': f'Processo concluído. {total_enviado} emails enviados.'})