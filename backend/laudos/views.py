from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import ModeloLaudo, Laudo
from .serializers import ModeloLaudoSerializer, LaudoSerializer

class ModeloLaudoViewSet(viewsets.ModelViewSet):
    """
    API para criar/listar os modelos de laudo (ex: Templates de USG).
    """
    queryset = ModeloLaudo.objects.filter(ativo=True)
    serializer_class = ModeloLaudoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['titulo', 'codigo_procedimento']

class LaudoViewSet(viewsets.ModelViewSet):
    """
    API para os laudos dos pacientes.
    """
    queryset = Laudo.objects.all().order_by('-data_criacao')
    serializer_class = LaudoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['paciente__nome_completo', 'titulo_exame']

    def get_queryset(self):
        # O médico só vê os laudos dele? Ou todos veem tudo?
        # Por enquanto, deixei todos verem tudo. Se quiser restringir:
        # return Laudo.objects.filter(medico=self.request.user)
        return super().get_queryset()