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

class CicloViewSet(viewsets.ModelViewSet):
    """
    ViewSet Principal do CRM.
    Gerencia os Cards, as Fases e o Histórico.
    """
    queryset = Ciclo.objects.all().order_by('-data_inicio')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['fase_atual', 'tipo', 'status', 'responsavel']
    search_fields = ['paciente__nome_completo', 'paciente__telefone_celular']

    def get_serializer_class(self):
        """
        Inteligência de Serialização:
        - Listagem (Kanban) -> Usa serializer leve (CicloKanbanSerializer).
        - Detalhe (Clique no Card) -> Usa serializer completo (CicloDetalheSerializer).
        """
        if self.action == 'retrieve':
            return CicloDetalheSerializer
        return CicloKanbanSerializer

    def perform_create(self, serializer):
        # Define quem criou o ciclo (se não informado)
        if not serializer.validated_data.get('responsavel'):
            serializer.save(responsavel=self.request.user)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def mover_fase(self, request, pk=None):
        """
        Endpoint específico para o Drag-and-Drop do Kanban.
        Recebe: { "nova_fase": "F2" }
        """
        ciclo = self.get_object()
        nova_fase = request.data.get('nova_fase')

        if nova_fase not in dict(Ciclo.FASE_CHOICES):
            return Response(
                {"erro": f"Fase '{nova_fase}' inválida."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        fase_anterior = ciclo.fase_atual
        ciclo.fase_atual = nova_fase
        ciclo.save()

        # Opcional: Lógica de negócio ao mudar de fase
        # Ex: Se moveu para "F4-Retenção", verificar se já existe próxima ação
        
        return Response({
            "status": "sucesso", 
            "mensagem": f"Ciclo movido de {fase_anterior} para {nova_fase}",
            "id": ciclo.id,
            "fase_atual": ciclo.fase_atual
        })

    @action(detail=False, methods=['get'])
    def kanban(self, request):
        """
        Retorna os ciclos já agrupados por colunas para facilitar o React.
        Estrutura: { "F1": [...], "F2": [...], ... }
        """
        ciclos = self.filter_queryset(self.get_queryset().filter(status='ativo'))
        serializer = self.get_serializer(ciclos, many=True)
        data = serializer.data

        # Agrupamento manual para entregar "mastigado" pro front
        kanban_data = {
            "F1": [], "F2": [], "F3": [], "F4": []
        }
        
        for item in data:
            fase = item.get('fase_atual')
            if fase in kanban_data:
                kanban_data[fase].append(item)
            else:
                # Caso existam fases antigas ou 'ENCERRADO' que ainda queremos ver
                if fase not in kanban_data:
                    kanban_data[fase] = []
                kanban_data[fase].append(item)

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