from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
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

        # --- NOVO: Endpoint para buscar credenciais ativas do paciente ---
    @action(detail=False, methods=['get'], url_path='credenciais-ativas')
    def credenciais_ativas(self, request):
        """
        Verifica se o paciente já tem um laudo recente com senha gerada.
        Uso: /prontuario/laudos/credenciais-ativas/?paciente_id=123
        """
        paciente_id = request.query_params.get('paciente_id')
        
        if not paciente_id:
            return Response({'erro': 'ID do paciente não fornecido'}, status=status.HTTP_400_BAD_REQUEST)

        # Pega o último laudo desse paciente que já tenha código gerado
        ultimo_laudo = Laudo.objects.filter(
            paciente_id=paciente_id,
            codigo_acesso__isnull=False
        ).order_by('-data_criacao').first()

        if ultimo_laudo:
            return Response({
                'encontrado': True,
                'codigo': ultimo_laudo.codigo_acesso,
                'senha': ultimo_laudo.senha_acesso,
                'link': 'https://clinica-limale.vercel.app/resultados', # Ajuste seu link
                'laudo_id': ultimo_laudo.id, # Opcional: se quiser abrir o laudo antigo
                'data': ultimo_laudo.data_criacao
            })
        
        return Response({'encontrado': False, 'msg': 'Nenhuma credencial ativa encontrada.'})