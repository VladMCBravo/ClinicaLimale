from rest_framework import generics
# --- 1. ADICIONE APIView E Response A ESTA LINHA ---
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
# --- 2. IMPORTE A PERMISSÃO DE ADMIN ---
from usuarios.permissions import IsRecepcaoOrAdmin, IsAdminUser
from .models import Agendamento
from .serializers import AgendamentoSerializer, AgendamentoWriteSerializer
from django.utils import timezone
from faturamento.models import Pagamento, Procedimento
# --- 3. IMPORTE A BIBLIOTECA datetime ---
import datetime

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
    serializer_class = AgendamentoSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        # A sua lógica de 'date.today()' estava correta, mas vamos usar timezone para consistência
        hoje = timezone.localtime(timezone.now()).date()
        return Agendamento.objects.filter(data_hora_inicio__date=hoje).order_by('data_hora_inicio')

# --- ADICIONE ESTA VIEW DE DEPURAÇÃO AO FINAL DO FICHEIRO ---
class DebugLembretesView(APIView):
    """
    Endpoint temporário para depurar o envio de lembretes.
    """
    permission_classes = [IsAdminUser] # Apenas admins podem aceder

    def get(self, request, *args, **kwargs):
        # Replica a lógica de cálculo de data do nosso script
        agora_servidor_utc = timezone.now()
        agora_servidor_local = timezone.localtime(agora_servidor_utc)
        
        amanha = agora_servidor_local.date() + datetime.timedelta(days=1)
        inicio_de_amanha = timezone.make_aware(datetime.datetime.combine(amanha, datetime.time.min))
        fim_de_amanha = timezone.make_aware(datetime.datetime.combine(amanha, datetime.time.max))

        # Executa a mesma consulta do script
        agendamentos_encontrados = Agendamento.objects.filter(
            data_hora_inicio__gte=inicio_de_amanha,
            data_hora_inicio__lte=fim_de_amanha,
            status='Confirmado'
        )

        # Serializa os dados encontrados para podermos vê-los
        serializer = AgendamentoSerializer(agendamentos_encontrados, many=True)

        # Devolve um relatório completo de depuração
        debug_data = {
            "agora_no_servidor_utc": agora_servidor_utc,
            "agora_no_servidor_local_(America/Sao_Paulo)": agora_servidor_local,
            "data_de_amanha_calculada": amanha,
            "intervalo_de_busca_inicio": inicio_de_amanha,
            "intervalo_de_busca_fim": fim_de_amanha,
            "total_de_agendamentos_encontrados": agendamentos_encontrados.count(),
            "dados_dos_agendamentos": serializer.data
        }
        
        return Response(debug_data)