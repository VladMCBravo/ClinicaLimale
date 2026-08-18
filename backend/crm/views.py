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
    # ========================================================
    # OTIMIZAÇÃO DE PERFORMANCE (FIM DA LENTIDÃO)
    # ========================================================
    queryset = Ciclo.objects.select_related(
        'paciente', 
        'responsavel',
        'paciente__perfil_comportamental' # Otimiza a busca do resumo comportamental
    ).prefetch_related(
        'agendamentos', # Otimiza o get_dados_agendamento
        'acoes'         # Otimiza o get_proxima_acao_imediata
    ).all().order_by('-data_inicio')
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['fase_atual', 'tipo', 'status', 'responsavel']
    search_fields = ['paciente__nome_completo', 'paciente__telefone_celular']

    # ========================================================
    # ADICIONE ESTE NOVO MÉTODO PARA SALVAR O COMPORTAMENTO
    # ========================================================
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # 1. Puxamos o dicionário de comportamento que o React enviou
        comportamento_data = request.data.pop('comportamento', None)
        
        # 2. Salva as alterações normais do ciclo (Fases, etc)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # 3. Se tiver dados de comportamento, injetamos no perfil do paciente
        if comportamento_data and instance.paciente:
            from .models import AnaliseComportamental
            comp, _ = AnaliseComportamental.objects.get_or_create(paciente=instance.paciente)
            
            # Loop iterativo que atualiza tudo que o React mandou (Instagram, objeções, origem, etc)
            for attr, value in comportamento_data.items():
                if hasattr(comp, attr):
                    setattr(comp, attr, value)
            comp.save()

        # Limpa o cache para retornar os dados frescos na resposta
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

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
        import time
        t0 = time.time()
        
        # --- NOVO: Captura o filtro da URL ---
        macro_area = request.query_params.get('macro_area')
        
        # O CRMService vai fazer o trabalho pesado agora
        kanban_data = CRMService.obter_dados_kanban(
            usuario_filtro=None, 
            macro_area_filtro=macro_area
        )
        
        t3 = time.time()
        print(f"⏱️ [CRM DEBUG] Tempo Total Kanban API: {t3 - t0:.3f}s")

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