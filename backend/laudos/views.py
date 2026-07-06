from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ModeloLaudo, Laudo
from .serializers import ModeloLaudoSerializer, LaudoSerializer
from django.core.files.base import ContentFile
from prontuario.utils import gerar_pdf_laudo_backend
from datetime import date

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
    
    @action(detail=True, methods=['post'], url_path='regerar-pdf')
    def regerar_pdf(self, request, pk=None):
        """
        Rota de resgate: Pega o JSON do laudo e força o backend a montar o PDF.
        """
        laudo = self.get_object()
        
        idade_formatada = ""
        if laudo.paciente and laudo.paciente.data_nascimento:
            hoje = date.today()
            nasc = laudo.paciente.data_nascimento
            anos = hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))
            idade_formatada = f"{anos} ANOS"

        # Reconstrói o contexto como se o laudo estivesse sendo feito agora
        contexto = {
            'laudo': laudo,
            'paciente': laudo.paciente,
            'medico': laudo.medico,
            'data_exame': laudo.data_criacao,
            'idade_formatada': idade_formatada,
            'imagens': [] # Segunda via é gerada apenas com o texto para ser rápido
        }
        
        pdf_bytes = gerar_pdf_laudo_backend(contexto)
        
        if pdf_bytes:
            nome_arquivo = f"laudo_regerado_{laudo.paciente.id}_{laudo.id}.pdf"
            # Salva o arquivo no banco e muda o status
            laudo.arquivo_pdf.save(nome_arquivo, ContentFile(pdf_bytes), save=True)
            laudo.status = 'FINALIZADO'
            laudo.save()
            
            return Response({'arquivo_url': laudo.arquivo_pdf.url})
            
        return Response({'erro': 'Falha interna ao gerar PDF'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({'encontrado': False, 'msg': 'Nenhuma credencial ativa encontrada.'})