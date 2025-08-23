# backend/agendamentos/views.py

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsRecepcaoOrAdmin
from .models import Agendamento
from .serializers import AgendamentoSerializer, AgendamentoWriteSerializer
from datetime import date
from faturamento.models import Pagamento

class AgendamentoListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Agendamento.objects.all().select_related('paciente').order_by('data_hora_inicio')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AgendamentoWriteSerializer
        return AgendamentoSerializer

    def perform_create(self, serializer):
        agendamento = serializer.save()

        if agendamento.tipo_atendimento == 'Particular':
            # --- ALTERAÇÃO AQUI DENTRO ---
            # Agora criamos um pagamento que é EXPLICITAMENTE pendente.
            Pagamento.objects.create(
                agendamento=agendamento,
                paciente=agendamento.paciente,
                valor=0.00,
                status='Pendente', # <-- Define o status como Pendente
                registrado_por=self.request.user,
                # Não definimos forma_pagamento nem data_pagamento aqui.
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