# Importações da Biblioteca Padrão do Python
from io import BytesIO

# Importações de Terceiros (Django, DRF, etc.)
from django.contrib.staticfiles import finders
from django.http import HttpResponse
from django.template.loader import get_template
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from rest_framework import generics, status, viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from xhtml2pdf import pisa

# Importações Locais (dos seus apps)
from usuarios.permissions import IsMedicoResponsavelOrAdmin
from .models import (
    Anamnese, Atestado, DocumentoPaciente, Evolucao, 
    Paciente, Prescricao, OpcaoClinica
)
from .serializers import (
    AnamneseSerializer, AtestadoSerializer, DocumentoPacienteSerializer,
    EvolucaoSerializer, PrescricaoSerializer, OpcaoClinicaSerializer
)


# --- Views de CRUD do Prontuário ---

class EvolucaoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EvolucaoSerializer
    permission_classes = [IsMedicoResponsavelOrAdmin]

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return Evolucao.objects.filter(paciente__id=paciente_id).order_by('-data_atendimento')

    def perform_create(self, serializer):
        try:
            # Pega o ID do paciente da URL
            paciente_id = self.kwargs.get('paciente_id')
            
            # Tenta encontrar o paciente no banco de dados
            paciente = Paciente.objects.get(id=paciente_id)
            
            # Salva a evolução, associando o médico logado e o paciente encontrado
            serializer.save(medico=self.request.user, paciente=paciente)

        except Paciente.DoesNotExist:
            # Se o paciente com aquele ID não existe, levanta um erro de validação
            raise ValidationError({"detail": f"Paciente com ID {paciente_id} não encontrado."})
        except Exception as e:
            # Se qualquer outro erro inesperado acontecer, levanta um erro de validação com a mensagem do erro
            # Isso transformará o erro 500 em um 400 com uma mensagem útil!
            raise ValidationError({"detail": f"Ocorreu um erro interno ao salvar a evolução: {str(e)}"})

# ▼▼▼ ADICIONE ESTA NOVA CLASSE ▼▼▼
class EvolucaoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    View para buscar, atualizar ou deletar uma única Evolução pelo seu ID.
    """
    queryset = Evolucao.objects.all()
    serializer_class = EvolucaoSerializer
    permission_classes = [IsMedicoResponsavelOrAdmin]
    # O lookup_field 'pk' é o padrão, então não precisamos declará-lo,
    # mas o DRF usará o ID passado na URL (ex: /evolucoes/1/) para buscar no queryset.

class PrescricaoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PrescricaoSerializer
    permission_classes = [IsMedicoResponsavelOrAdmin]

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return Prescricao.objects.filter(paciente__id=paciente_id).order_by('-data_prescricao')

    def perform_create(self, serializer):
        paciente = Paciente.objects.get(id=self.kwargs.get('paciente_id'))
        serializer.save(medico=self.request.user, paciente=paciente)


class AtestadoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AtestadoSerializer
    permission_classes = [IsMedicoResponsavelOrAdmin]

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return Atestado.objects.filter(paciente__id=paciente_id).order_by('-data_emissao')

    def perform_create(self, serializer):
        paciente = Paciente.objects.get(id=self.kwargs.get('paciente_id'))
        serializer.save(medico=self.request.user, paciente=paciente)


class AnamneseDetailAPIView(generics.GenericAPIView):
    serializer_class = AnamneseSerializer
    permission_classes = [IsMedicoResponsavelOrAdmin]

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return Anamnese.objects.filter(paciente__id=paciente_id)

    def get(self, request, *args, **kwargs):
        try:
            anamnese = self.get_queryset().get()
            serializer = self.get_serializer(anamnese)
            return Response(serializer.data)
        except Anamnese.DoesNotExist:
            return Response({"detail": "Anamnese não encontrada."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, *args, **kwargs):
        paciente_id = self.kwargs.get('paciente_id')
        if Anamnese.objects.filter(paciente__id=paciente_id).exists():
            return Response({"detail": "Anamnese já existe para este paciente."}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        paciente = Paciente.objects.get(id=paciente_id)
        serializer.save(medico=request.user, paciente=paciente)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def put(self, request, *args, **kwargs):
        try:
            instance = self.get_queryset().get()
            serializer = self.get_serializer(instance, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except Anamnese.DoesNotExist:
            return Response({"detail": "Anamnese não encontrada para atualizar."}, status=status.HTTP_404_NOT_FOUND)


# --- ViewSet de Anexos/Documentos ---

class DocumentoPacienteViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentoPacienteSerializer
    permission_classes = [IsMedicoResponsavelOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return DocumentoPaciente.objects.filter(paciente__id=self.kwargs.get('paciente_id')).order_by('-data_upload')

    def perform_create(self, serializer):
        paciente = Paciente.objects.get(id=self.kwargs.get('paciente_id'))
        serializer.save(enviado_por=self.request.user, paciente=paciente)


# --- Views de Geração de PDF ---

class GerarPrescricaoPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, prescricao_id, *args, **kwargs):
        try:
            prescricao = Prescricao.objects.get(pk=prescricao_id)
        except Prescricao.DoesNotExist:
            return HttpResponse("Prescrição não encontrada.", status=404)
        
        logo_path = finders.find('images/logo.png')
        template = get_template('pdfs/prescricao_template.html')
        context = {'prescricao': prescricao, 'logo_path': logo_path}
        html = template.render(context)
        
        result = BytesIO()
        pdf = pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result, link_callback=lambda uri, rel: logo_path)
        
        if not pdf.err:
            response = HttpResponse(result.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'filename="prescricao_{prescricao.paciente.nome_completo}_{prescricao.id}.pdf"'
            return response
            
        return HttpResponse('Ocorreu um erro ao gerar o PDF.', status=500)


class GerarAtestadoPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, atestado_id, *args, **kwargs):
        try:
            atestado = Atestado.objects.get(pk=atestado_id)
        except Atestado.DoesNotExist:
            return HttpResponse("Atestado não encontrado.", status=404)
        
        logo_path = finders.find('images/logo.png')
        template = get_template('pdfs/atestado_template.html')
        context = {'atestado': atestado, 'logo_path': logo_path}
        html = template.render(context)
        
        result = BytesIO()
        pdf = pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result, link_callback=lambda uri, rel: logo_path)
        
        if not pdf.err:
            response = HttpResponse(result.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'filename="atestado_{atestado.paciente.nome_completo}_{atestado.id}.pdf"'
            return response
            
        return HttpResponse('Ocorreu um erro ao gerar o PDF.', status=500)

class OpcaoClinicaListView(generics.ListAPIView):
    """
    View para listar as opções clínicas.
    Permite filtrar por ?especialidade=Cardiologia e ?area_clinica=HDA
    """
    serializer_class = OpcaoClinicaSerializer
    permission_classes = [IsAuthenticated] # Apenas usuários logados podem ver

    def get_queryset(self):
        queryset = OpcaoClinica.objects.all()
        especialidade = self.request.query_params.get('especialidade')
        area_clinica = self.request.query_params.get('area_clinica')

        if especialidade:
            queryset = queryset.filter(especialidade=especialidade)

        if area_clinica:
            queryset = queryset.filter(area_clinica=area_clinica)

        return queryset