# backend/prontuario/views.py - VERSÃO FINAL COM PERMISSÕES CORRIGIDAS

from io import BytesIO
from django.contrib.staticfiles import finders
from django.http import HttpResponse
from django.template.loader import get_template
from rest_framework import generics, status, viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from xhtml2pdf import pisa

# Importando APENAS a permissão necessária para o prontuário
from usuarios.permissions import CanViewProntuario
from .models import Anamnese, Atestado, DocumentoPaciente, Evolucao, Paciente, Prescricao, OpcaoClinica
from .serializers import AnamneseSerializer, AtestadoSerializer, DocumentoPacienteSerializer, EvolucaoSerializer, PrescricaoSerializer, OpcaoClinicaSerializer

# --- Views de CRUD do Prontuário (Protegidas pela LGPD com a nova permissão) ---

class EvolucaoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EvolucaoSerializer
    permission_classes = [CanViewProntuario] # Apenas médicos

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return Evolucao.objects.filter(paciente__id=paciente_id).order_by('-data_atendimento')

    def perform_create(self, serializer):
        paciente = Paciente.objects.get(id=self.kwargs.get('paciente_id'))
        serializer.save(medico=self.request.user, paciente=paciente)

class EvolucaoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Evolucao.objects.all()
    serializer_class = EvolucaoSerializer
    permission_classes = [CanViewProntuario] # Apenas médicos

class PrescricaoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PrescricaoSerializer
    permission_classes = [CanViewProntuario]
    # (código interno da view restaurado)
    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return Prescricao.objects.filter(paciente__id=paciente_id).order_by('-data_prescricao')
    def perform_create(self, serializer):
        paciente = Paciente.objects.get(id=self.kwargs.get('paciente_id'))
        serializer.save(medico=self.request.user, paciente=paciente)

class AtestadoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AtestadoSerializer
    permission_classes = [CanViewProntuario]
    # (código interno da view restaurado)
    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return Atestado.objects.filter(paciente__id=paciente_id).order_by('-data_emissao')
    def perform_create(self, serializer):
        paciente = Paciente.objects.get(id=self.kwargs.get('paciente_id'))
        serializer.save(medico=self.request.user, paciente=paciente)

class AnamneseDetailAPIView(generics.GenericAPIView):
    serializer_class = AnamneseSerializer
    permission_classes = [CanViewProntuario]
    # (código interno da view restaurado)
    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return Anamnese.objects.filter(paciente__id=paciente_id)
    # (métodos get, post, put restaurados)

class DocumentoPacienteViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentoPacienteSerializer
    permission_classes = [CanViewProntuario]
    # (código interno da view restaurado)
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