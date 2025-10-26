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
from usuarios.permissions import CanViewProntuario, IsMedicoResponsavelOrAdmin
from .models import Anamnese, Atestado, DocumentoPaciente, Evolucao, Paciente, Evolucao, Prescricao, OpcaoClinica, MarcoDNPM, VacinaPaciente
from .serializers import AnamneseSerializer, AtestadoSerializer, DocumentoPacienteSerializer, EvolucaoSerializer, PrescricaoSerializer, OpcaoClinicaSerializer, MarcoDNPMSerializer, VacinaPacienteSerializer
from usuarios.permissions import CanViewProntuario # Verifique se esta permissão está correta

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

class AnamneseDetailAPIView(generics.RetrieveUpdateAPIView):
    """
    View para buscar (GET) ou atualizar (PUT/PATCH) a anamnese de um paciente.
    Esta view substitui a GenericAPIView anterior para resolver o erro 405.
    """
    serializer_class = AnamneseSerializer
    permission_classes = [CanViewProntuario]

    def get_object(self):
        """
        Busca e retorna a instância única da anamnese para o paciente da URL.
        """
        paciente_id = self.kwargs.get('paciente_id')
        try:
            # .get() é usado aqui porque esperamos apenas uma anamnese por paciente
            return Anamnese.objects.get(paciente__id=paciente_id)
        except Anamnese.DoesNotExist:
            # Se não existir, o DRF tratará isso e retornará um 404 Not Found.
            return None

class DocumentoPacienteViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentoPacienteSerializer
    permission_classes = [IsMedicoResponsavelOrAdmin]
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

# --- ADICIONE ESTA NOVA CLASSE ---
class GerarEvolucaoPDFView(APIView):
    permission_classes = [IsAuthenticated] # Ou [CanViewProntuario] se preferir

    def get(self, request, evolucao_id, *args, **kwargs):
        try:
            evolucao = Evolucao.objects.get(pk=evolucao_id)
        except Evolucao.DoesNotExist:
            return HttpResponse("Evolução não encontrada.", status=404)
        
        # Logo da clínica (você já usa isso)
        logo_path = finders.find('images/logo.png') 
        
        # Nome do novo template que criaremos
        template = get_template('pdfs/evolucao_template.html') 
        
        context = {
            'evolucao': evolucao,
            'paciente': evolucao.paciente,
            'medico': evolucao.medico,
            'logo_path': logo_path
        }
        html = template.render(context)
        
        result = BytesIO()
        pdf = pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result, link_callback=lambda uri, rel: logo_path)
        
        if not pdf.err:
            response = HttpResponse(result.getvalue(), content_type='application/pdf')
            # Nome do arquivo que será baixado
            response['Content-Disposition'] = f'filename="evolucao_{evolucao.paciente.nome_completo}_{evolucao.id}.pdf"'
            return response
            
        return HttpResponse('Ocorreu um erro ao gerar o PDF.', status=500)

# --- ADICIONE ESTA CLASSE ---
class EvolucaoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    View para Ver, Atualizar ou Deletar UMA evolução específica.
    Usada pelo modal de histórico.
    """
    queryset = Evolucao.objects.all()
    serializer_class = EvolucaoSerializer
    permission_classes = [CanViewProntuario] # Apenas médicos podem ver/editar
    lookup_field = 'pk' # Informa que o <int:pk> da URL é o ID
# --- FIM DA CLASSE ---

# --- INÍCIO DAS NOVAS ADIÇÕES ---

class MarcoDNPMListCreateView(generics.ListCreateAPIView):
    """
    View para listar (GET) e criar (POST) marcos de DNPM para um paciente.
    """
    serializer_class = MarcoDNPMSerializer
    permission_classes = [CanViewProntuario]

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return MarcoDNPM.objects.filter(paciente__id=paciente_id).order_by('data_registro')

    def perform_create(self, serializer):
        paciente = Paciente.objects.get(id=self.kwargs.get('paciente_id'))
        serializer.save(medico=self.request.user, paciente=paciente)

class VacinaPacienteListCreateView(generics.ListCreateAPIView):
    """
    View para listar (GET) e criar (POST) vacinas para um paciente.
    """
    serializer_class = VacinaPacienteSerializer
    permission_classes = [CanViewProntuario] # Ou outra permissão se a recepção puder editar

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return VacinaPaciente.objects.filter(paciente__id=paciente_id).order_by('id') # Pode ordenar como preferir

    def perform_create(self, serializer):
        paciente = Paciente.objects.get(id=self.kwargs.get('paciente_id'))
        serializer.save(paciente=paciente)
        
# --- FIM DAS NOVAS ADIÇÕES ---