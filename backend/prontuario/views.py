# backend/prontuario/views.py - VERSÃO FINAL COM PERMISSÕES CORRIGIDAS

from io import BytesIO
from django.db import models
from django.contrib.staticfiles import finders
from django.http import HttpResponse
from django.template.loader import get_template
from rest_framework import generics, status, viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from xhtml2pdf import pisa
from django.shortcuts import get_object_or_404 # Para buscar objetos
from django.template import Context, Template # Para renderizar o template
from datetime import date # Para a data de hoje
from django.db import transaction # Importar transaction

# Importando APENAS a permissão necessária para o prontuário
from usuarios.permissions import CanViewProntuario, IsMedicoResponsavelOrAdmin
from .models import (
    Anamnese, Atestado, DocumentoPaciente, Evolucao, Paciente, 
    Evolucao, Prescricao, OpcaoClinica, ItemPrescricao, AnamneseGinecologica, 
    AnamneseOrtopedia, AnamneseCardiologia, AnamnesePediatria, AnamneseNeonatologia, AnamneseClinicaGeral,
    MarcoDNPM, VacinaPaciente, TemplateRelatorio, RelatorioSalvo
)
from .serializers import (
    AnamneseSerializer, AtestadoSerializer, DocumentoPacienteSerializer, 
    EvolucaoSerializer, PrescricaoSerializer, OpcaoClinicaSerializer,
    MarcoDNPMSerializer, VacinaPacienteSerializer, TemplateRelatorioSerializer, RelatorioSalvoListSerializer, RelatorioSalvoCreateSerializer
)
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
    View para buscar (GET) ou atualizar (PUT/PATCH) a anamnese.
    Corrigida para criar a anamnese principal E todas as suas filhas
    de especialidade caso elas não existam, evitando o Erro 500.
    """
    serializer_class = AnamneseSerializer
    permission_classes = [CanViewProntuario]

    @transaction.atomic # Garante que as criações sejam atômicas
    def get_object(self):
        paciente_id = self.kwargs.get('paciente_id')
        
        # Tenta buscar. Se não existir, o get_or_create é acionado
        obj, created = Anamnese.objects.get_or_create(
            paciente_id=paciente_id,
            defaults={'medico': self.request.user} # Define o médico se for criado
        )
        
        # Se a Anamnese principal ACABOU de ser criada...
        if created:
            # ... precisamos criar imediatamente seus filhos de especialidade vazios
            # para que o AnamneseSerializer não falhe ao tentar acessá-los.
            AnamneseGinecologica.objects.create(anamnese=obj)
            AnamneseOrtopedia.objects.create(anamnese=obj)
            AnamneseCardiologia.objects.create(anamnese=obj)
            AnamnesePediatria.objects.create(anamnese=obj)
            AnamneseNeonatologia.objects.create(anamnese=obj)
            AnamneseClinicaGeral.objects.create(anamnese=obj)
            
        return obj
# --- FIM DA CORREÇÃO ---

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
# --- INÍCIO DAS NOVAS ADIÇÕES ---

class MarcoDNPMDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    View para Ver (GET), Atualizar (PATCH/PUT) ou Deletar (DELETE)
    UM marco de DNPM específico.
    """
    queryset = MarcoDNPM.objects.all()
    serializer_class = MarcoDNPMSerializer
    permission_classes = [CanViewProntuario]
    lookup_field = 'pk' # Informa que o <int:pk> da URL é o ID

class VacinaPacienteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    View para Ver (GET), Atualizar (PATCH/PUT) ou Deletar (DELETE)
    UMA vacina específica do paciente.
    """
    queryset = VacinaPaciente.objects.all()
    serializer_class = VacinaPacienteSerializer
    permission_classes = [CanViewProntuario]
    lookup_field = 'pk'

class VacinaStatusView(APIView):
    """
    Verifica o status da vacinação do paciente.
    Retorna: {'status': 'em_dia'} ou {'status': 'atrasada'}
    """
    permission_classes = [CanViewProntuario]

    def get(self, request, paciente_id):
        # A lógica é simples: se UMA vacina estiver 'Atrasada', o status é 'atrasada'.
        if VacinaPaciente.objects.filter(paciente__id=paciente_id, status='Atrasada').exists():
            return Response({'status': 'atrasada'})
        
        # Se não houver nenhuma atrasada (pode ter Pendente ou Aplicada)
        return Response({'status': 'em_dia'})

class DNPMStatusView(APIView):
    """
    Verifica o status resumo do DNPM do paciente.
    Retorna: {'status': 'normal'} | {'status': 'alerta'} | {'status': 'atraso'} | {'status': None}
    """
    permission_classes = [CanViewProntuario]

    def get(self, request, paciente_id):
        try:
            # 1. Busca a Anamnese principal
            anamnese = Anamnese.objects.get(paciente__id=paciente_id)
            # 2. Acessa a anamnese pediátrica aninhada
            anamnese_pediatrica = anamnese.pediatrica
            # 3. Lê o JSONField 'dnpm'
            dnpm_data = anamnese_pediatrica.dnpm # Este é o JSONField { dnpm_normal_idade: true, ... }

            if dnpm_data.get('dnpm_atraso'):
                return Response({'status': 'atraso'})
            if dnpm_data.get('dnpm_sinais_alerta'):
                return Response({'status': 'alerta'})
            if dnpm_data.get('dnpm_normal_idade'):
                return Response({'status': 'normal'})
            
            return Response({'status': None}) # Nenhuma opção marcada
            
        except (Anamnese.DoesNotExist, AnamnesePediatria.DoesNotExist, AttributeError, TypeError):
            # Se a anamnese ou os dados não existirem, retorna Nulo
            return Response({'status': None})
# --- FIM DAS NOVAS ADIÇÕES ---

# --- INÍCIO DAS NOVAS VIEWS DE RELATÓRIOS ---

class TemplateRelatorioListView(generics.ListAPIView):
    """
    View para listar os TEMPLATES de relatórios disponíveis.
    Filtra por ?especialidade=cardiologia
    """
    serializer_class = TemplateRelatorioSerializer
    permission_classes = [IsAuthenticated] # Apenas médicos logados
    
    def get_queryset(self):
        queryset = TemplateRelatorio.objects.all()
        # Filtra pela especialidade (ex: 'cardiologia')
        especialidade = self.request.query_params.get('especialidade')
        if especialidade:
            queryset = queryset.filter(models.Q(especialidade=especialidade) | models.Q(especialidade='geral'))
        return queryset.order_by('titulo')


class RelatorioSalvoListView(generics.ListAPIView):
    """
    View para listar (GET) os relatórios JÁ SALVOS de um paciente.
    """
    serializer_class = RelatorioSalvoListSerializer
    permission_classes = [CanViewProntuario] # Protegido
    
    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return RelatorioSalvo.objects.filter(paciente__id=paciente_id).order_by('-data_criacao')


class RelatorioSalvoCreateView(generics.CreateAPIView):
    """
    View para criar (POST) um novo relatório salvo para um paciente.
    """
    serializer_class = RelatorioSalvoCreateSerializer
    permission_classes = [CanViewProntuario] # Protegido

    def perform_create(self, serializer):
        # Pega o paciente da URL
        paciente = get_object_or_404(Paciente, id=self.kwargs.get('paciente_id'))
        # Define o médico e o paciente automaticamente
        serializer.save(medico=self.request.user, paciente=paciente)


class GerarPreviewRelatorioView(APIView):
    """
    A view "mágica" que gera a prévia do relatório preenchido.
    (VERSÃO ATUALIZADA - Suporta Múltiplas Especialidades)
    
    Recebe (POST): { "template_id": X, "consulta_id": Y }
    Retorna: { "conteudo_preenchido": "..." }
    """
    permission_classes = [CanViewProntuario] # Protegido

    def post(self, request, paciente_id):
        template_id = request.data.get('template_id')
        consulta_id = request.data.get('consulta_id') # Opcional

        # 1. Obter os objetos principais
        paciente = get_object_or_404(Paciente, id=paciente_id)
        template_obj = get_object_or_404(TemplateRelatorio, id=template_id)
        medico = request.user
        
        # 2. Obter as fontes de dados (Consulta e Anamnese Base)
        consulta = None
        if consulta_id:
            try:
                consulta = Evolucao.objects.get(id=consulta_id, paciente=paciente)
            except Evolucao.DoesNotExist:
                pass 
        
        anamnese_base = None
        try:
            anamnese_base = Anamnese.objects.get(paciente=paciente)
        except Anamnese.DoesNotExist:
            pass # Continua sem dados de anamnese

        # 3. Montar o Contexto BASE (Paciente, Médico, Consulta)
        
        # Dados do Paciente
        context_data = {
            'paciente_nome': paciente.nome_completo,
            'paciente_cpf': paciente.cpf or 'NÃO INFORMADO',
            'paciente_data_nasc': paciente.data_nascimento.strftime('%d/%m/%Y') if paciente.data_nascimento else '',
            'paciente_idade': paciente.get_idade_anos() if hasattr(paciente, 'get_idade_anos') else '', 
        }

        # Dados do Médico
        try:
            crm = medico.profile.crm
        except AttributeError:
            crm = "CRM NÃO INFORMADO"
            
        context_data.update({
            'data_hoje': date.today().strftime('%d/%m/%Y'),
            'medico_nome': medico.get_full_name() or medico.username,
            'medico_crm': crm,
        })

        # Dados da Consulta (genéricos para todos)
        if consulta:
            context_data.update({
                'consulta_data': consulta.data_atendimento.strftime('%d/%m/%Y'),
                'consulta_queixa': consulta.notas_subjetivas,
                'consulta_exame_fisico': consulta.notas_objetivas,
                'consulta_avaliacao': consulta.avaliacao,
                'consulta_plano': consulta.plano,
                'consulta_pa': consulta.pressao_arterial or "__/__",
                'consulta_fc': consulta.frequencia_cardiaca or "__",
            })

        # 4. === NOVA LÓGICA: Adicionar Contexto Específico da Especialidade ===
        
        specialty_context = {} # Dicionário para os dados da especialidade
        
        if anamnese_base: # Só busca dados específicos se a anamnese existir
            
            # --- Se o Template for de CARDIOLOGIA ---
            if template_obj.especialidade == 'cardiologia':
                try:
                    obj = anamnese_base.cardiologica
                    data = obj.fatores_risco if obj.fatores_risco else {}
                    specialty_context.update({
                        'anamnese_has': "Sim" if data.get('has') else "Não",
                        'anamnese_dm': "Sim" if data.get('dm') else "Não",
                        'anamnese_tabagista': obj.habito_tabagismo or "N/A",
                        'anamnese_outras_comorbidades': obj.comorbidades_outras or "N/A",
                    })
                except (AnamneseCardiologia.DoesNotExist, AttributeError):
                    pass # Falha silenciosamente

            # --- Se o Template for de PEDIATRIA ---
            elif template_obj.especialidade == 'pediatria':
                try:
                    obj = anamnese_base.pediatrica
                    specialty_context.update({
                        'pedia_tipo_parto': obj.tipo_parto or "N/A",
                        'pedia_peso_nascimento': obj.peso_nascimento or "N/A",
                        'pedia_apgar': obj.apgar or "N/A",
                        'pedia_vacinacao_resumo': obj.vacinacao or "N/A",
                        # (Adicione aqui quaisquer outros campos da AnamnesePediatria)
                    })
                except (AnamnesePediatria.DoesNotExist, AttributeError):
                    pass
            
            # --- Se o Template for de GINECOLOGIA ---
            elif template_obj.especialidade == 'ginecologia':
                try:
                    obj = anamnese_base.ginecologica
                    specialty_context.update({
                        'gineco_dum': obj.dum.strftime('%d/%m/%Y') if obj.dum else "N/A",
                        'gineco_gesta': obj.gesta,
                        'gineco_para': obj.para,
                        'gineco_mac_atual': obj.mac_atual or "N/A",
                        # (Adicione aqui quaisquer outros campos da AnamneseGinecologica)
                    })
                except (AnamneseGinecologica.DoesNotExist, AttributeError):
                    pass
            
            # (Adicione 'elif' para Ortopedia, ClinicaGeral, etc. aqui)

        # 5. Adicionar o contexto da especialidade ao contexto principal
        context_data.update(specialty_context)
        
        # 6. Renderizar o template
        template_engine = Template(template_obj.conteudo)
        context_engine = Context(context_data)
        conteudo_preenchido = template_engine.render(context_engine)

        return Response({'conteudo_preenchido': conteudo_preenchido})

# --- FIM DAS NOVAS VIEWS DE RELATÓRIOS ---