# backend/crm/views.py

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from .models import Ciclo, ProximaAcao, AnaliseComportamental
from .serializers import (
    CicloKanbanSerializer, 
    CicloDetalheSerializer, 
    ProximaAcaoSerializer,
    AnaliseComportamentalSerializer
)
from .services import CRMService

class CicloViewSet(viewsets.ModelViewSet):
    queryset = Ciclo.objects.all().order_by('-data_inicio')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['fase_atual', 'tipo', 'status', 'responsavel']
    search_fields = ['paciente__nome_completo', 'paciente__telefone_celular']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CicloDetalheSerializer
        return CicloKanbanSerializer

    def perform_create(self, serializer):
        if not serializer.validated_data.get('responsavel'):
            serializer.save(responsavel=self.request.user)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def mover_fase(self, request, pk=None):
        nova_fase = request.data.get('nova_fase')
        if nova_fase not in dict(Ciclo.FASE_CHOICES):
            return Response({"erro": "Fase inválida."}, status=400)

        # Delega ao Service
        ciclo = CRMService.mover_fase(pk, nova_fase, request.user)
        
        return Response({
            "status": "sucesso", 
            "id": ciclo.id,
            "fase_atual": ciclo.fase_atual
        })

    @action(detail=False, methods=['get'])
    def kanban(self, request):
        """
        Retorna os dados agrupados.
        """
        # Filtra primeiro
        queryset = self.filter_queryset(self.get_queryset().filter(status='ativo'))
        
        # Serializa
        serializer = self.get_serializer(queryset, many=True)
        data_serializada = serializer.data

        # Agrupa os dados para o Frontend
        # --- AQUI ESTÁ A CORREÇÃO DA F5 ---
        kanban_data = { "F1": [], "F2": [], "F3": [], "F4": [], "F5": [], "ENCERRADO": [] }
        
        for item in data_serializada:
            fase = item.get('fase_atual', 'F1')
            if fase in kanban_data:
                kanban_data[fase].append(item)
            else:
                kanban_data.setdefault(fase, []).append(item)

        return Response(kanban_data)

class ProximaAcaoViewSet(viewsets.ModelViewSet):
    """
    Gerencia as Tarefas (To-Do) do CRM.
    """
    queryset = ProximaAcao.objects.all().order_by('data_alvo')
    serializer_class = ProximaAcaoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ciclo', 'status', 'responsavel', 'data_alvo']

    @action(detail=True, methods=['post'])
    def concluir(self, request, pk=None):
        """Marca a tarefa como realizada"""
        acao = self.get_object()
        acao.status = 'REALIZADA'
        acao.realizado_em = timezone.now()
        acao.save()
        return Response({"status": "Ação concluída"})

class AnaliseComportamentalViewSet(viewsets.ModelViewSet):
    """
    CRUD simples para o Perfil Comportamental.
    Geralmente acessado via ID do Paciente.
    """
    queryset = AnaliseComportamental.objects.all()
    serializer_class = AnaliseComportamentalSerializer
    
    # Permite buscar pelo ID do paciente: /api/crm/comportamento/?paciente=123
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['paciente']