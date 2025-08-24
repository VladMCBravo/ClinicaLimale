# backend/agendamentos/views.py

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsRecepcaoOrAdmin
from .models import Agendamento
from .serializers import AgendamentoSerializer, AgendamentoWriteSerializer
from datetime import date
from faturamento.models import Pagamento, Procedimento

class AgendamentoListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Agendamento.objects.all().select_related('paciente').order_by('data_hora_inicio')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AgendamentoWriteSerializer
        return AgendamentoSerializer

    def perform_create(self, serializer):
        # Primeiro, salvamos o agendamento como de costume
        agendamento = serializer.save()

        # Agora, verificamos se o atendimento é Particular
        if agendamento.tipo_atendimento == 'Particular':
            valor_do_pagamento = 0.00 # Valor padrão

            # Se um procedimento foi associado ao agendamento, usamos o valor dele
            if agendamento.procedimento:
                valor_do_pagamento = agendamento.procedimento.valor

            # Criamos o registro de pagamento com o valor correto
            Pagamento.objects.create(
                agendamento=agendamento,
                paciente=agendamento.paciente,
                valor=valor_do_pagamento, # <-- A MÁGICA ACONTECE AQUI
                status='Pendente',
                registrado_por=self.request.user
            )
        
class AgendamentoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    # ... (sem alterações) ...
    permission_classes = [IsAuthenticated]
    queryset = Agendamento.objects.all()
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AgendamentoWriteSerializer
        return AgendamentoSerializer

class AgendamentosNaoPagosListAPIView(generics.ListAPIView):
    # ... (sem alterações) ...
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]
    def get_queryset(self):
        return Agendamento.objects.filter(pagamento__isnull=True).order_by('data_hora_inicio')

class AgendamentosHojeListView(generics.ListAPIView):
    # ... (sem alterações) ...
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        today = date.today()
        return Agendamento.objects.filter(data_hora_inicio__date=today).order_by('data_hora_inicio')