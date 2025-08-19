from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsRecepcaoOrAdmin
from .models import Agendamento
# 1. Importamos os dois serializers
from .serializers import AgendamentoSerializer, AgendamentoWriteSerializer
from datetime import date

class AgendamentoListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Agendamento.objects.all().select_related('paciente').order_by('data_hora_inicio')

    # 2. Método inteligente para escolher o serializer correto
    def get_serializer_class(self):
        if self.request.method == 'POST':
            # Para criar, usamos o serializer de escrita
            return AgendamentoWriteSerializer
        # Para listar, usamos o serializer de leitura
        return AgendamentoSerializer

class AgendamentoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Agendamento.objects.all()

    # 3. Mesmo método inteligente aqui para a tela de detalhes
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            # Para atualizar, usamos o serializer de escrita
            return AgendamentoWriteSerializer
        # Para ver os detalhes, usamos o serializer de leitura
        return AgendamentoSerializer

class AgendamentosNaoPagosListAPIView(generics.ListAPIView):
    """
    View para listar apenas os agendamentos que ainda não
    possuem um pagamento vinculado. (Nome corrigido e view duplicada removida)
    """
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated, IsRecepcaoOrAdmin]

    def get_queryset(self):
        return Agendamento.objects.filter(pagamento__isnull=True).order_by('data_hora_inicio')

class AgendamentosHojeListView(generics.ListAPIView):
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        today = date.today()
        return Agendamento.objects.filter(data_hora_inicio__date=today).order_by('data_hora_inicio')