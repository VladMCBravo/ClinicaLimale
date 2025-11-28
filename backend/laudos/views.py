from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import ModeloLaudo, Laudo
from .serializers import ModeloLaudoSerializer, LaudoSerializer

class ModeloLaudoViewSet(viewsets.ModelViewSet):
    """
    CRUD para os Templates (Modelos de Laudo).
    Ex: Criar modelo 'Obstétrico 1º Trimestre' com os campos padrão.
    """
    queryset = ModeloLaudo.objects.filter(ativo=True)
    serializer_class = ModeloLaudoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    # Corrigido: codigo_mnemonico
    search_fields = ['titulo', 'codigo_mnemonico'] 

class LaudoViewSet(viewsets.ModelViewSet):
    """
    CRUD para os Laudos dos Pacientes.
    """
    queryset = Laudo.objects.all().order_by('-data_criacao')
    serializer_class = LaudoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    # Permite buscar pelo nome do paciente ou tipo de exame
    search_fields = ['paciente__nome_completo', 'titulo_exame']

    def perform_create(self, serializer):
        # Garante que o médico seja salvo no create (reforço do serializer)
        serializer.save(medico=self.request.user)