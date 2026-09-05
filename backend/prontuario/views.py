# backend/prontuario/views.py - VERSÃO FINAL COM PERMISSÕES CORRIGIDAS

from io import BytesIO
import io
import os
import qrcode
from pypdf import PdfReader, PdfWriter
from django.db import models
from django.conf import settings # <-- IMPORTAR SETTINGS
from django.contrib.staticfiles import finders
from django.http import HttpResponse
from django.template.loader import get_template
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from .tasks import processar_laudo_background
from xhtml2pdf import pisa
from rest_framework.generics import ListAPIView # <--- Verifique se ListAPIView está importado
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404 # Para buscar objetos
from agendamentos.models import Agendamento # <-- 1. Importe o Agendamento
from usuarios.models import Especialidade # <-- 2. Importe Especialidade
from django.template import Context, Template # Para renderizar o template
from datetime import date, timedelta
from django.db import transaction # Importar transaction
from core.models import Clinica # Importa o modelo de configuração
from core.services_assinatura import assinar_pdf_digitalmente
import base64
from django.core.files.base import ContentFile
from .models import Laudo, ImagemLaudo
from prontuario.models import Laudo
from exames.models import Exame, ArquivoExame
from exames.serializers import ExameSerializer
from .serializers import LaudoSerializer, PatientBannerSerializer, WorkspacePacienteSerializer

# Importando APENAS a permissão necessária para o prontuário
from usuarios.permissions import CanViewProntuario, IsMedicoResponsavelOrAdmin, CanCreateAtestado
from .models import (
    Anamnese, Atestado, DocumentoPaciente, Evolucao, Paciente, Prescricao, OpcaoClinica, ModeloPrescricao, AnamneseGinecologica, 
    AnamneseOrtopedia, AnamneseCardiologia, AnamnesePediatria, AnamneseNeonatologia, AnamneseClinicaGeral,
    MarcoDNPM, VacinaPaciente, TemplateRelatorio, RelatorioSalvo
)
from .serializers import (
    AnamneseSerializer, AtestadoSerializer, DocumentoPacienteSerializer, 
    EvolucaoSerializer, PrescricaoSerializer, OpcaoClinicaSerializer, ModeloPrescricaoSerializer,
    MarcoDNPMSerializer, VacinaPacienteSerializer, TemplateRelatorioSerializer, RelatorioSalvoListSerializer, RelatorioSalvoCreateSerializer
)

# --- ★★★ REVERTEMOS PARA A VIEW ÚNICA ★★★ ---
# (Delete todas as classes BaseEvolucaoCreateAPIView e suas filhas)

class EvolucaoListCreateAPIView(generics.ListCreateAPIView):
    """
    View ÚNICA para Listar (GET) e Criar (POST) evoluções.
    Modificada com inteligência anti-duplicação (Upsert).
    """
    serializer_class = EvolucaoSerializer
    permission_classes = [CanViewProntuario]

    def get_queryset(self):
        """ Lista evoluções do paciente (sem mudança) """
        paciente_id = self.kwargs.get('paciente_id')
        return Evolucao.objects.filter(paciente__id=paciente_id).order_by('-data_atendimento')

    def create(self, request, *args, **kwargs):
        """
        INTERCEPTOR: Se o agendamento já tiver uma evolução, atualiza em vez de dar erro 400.
        """
        agendamento_id = request.data.get('agendamento')
        
        if agendamento_id:
            # Busca se já existe alguma evolução salva para este agendamento específico
            evolucao_existente = Evolucao.objects.filter(agendamento_id=agendamento_id).first()
            
            if evolucao_existente:
                # Mesma trava de autoria do EvolucaoDetailAPIView.perform_update: sem isso,
                # esse caminho de upsert (por agendamento) deixava qualquer usuário com
                # CanViewProntuario sobrescrever a evolução de outro médico sem checagem.
                if evolucao_existente.medico != request.user:
                    raise PermissionDenied("Acesso Negado: Apenas o médico autor pode alterar esta evolução.")
                serializer = self.get_serializer(evolucao_existente, data=request.data, partial=True)
                
                # 📢 MEGAFONE AQUI: Se der erro na atualização, printa no terminal
                if not serializer.is_valid():
                    print("\n🚨 ERRO 400 (ATUALIZANDO EVOLUÇÃO) - O DJANGO BARROU! MOTIVO:")
                    print(serializer.errors)
                    print("\n")
                    
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)

        # Se não existe evolução para esse ID de agendamento, cria um novo registro
        serializer = self.get_serializer(data=request.data)
        
        # 📢 MEGAFONE AQUI: Se der erro na criação, printa no terminal
        if not serializer.is_valid():
            print("\n🚨 ERRO 400 (CRIANDO NOVA EVOLUÇÃO) - O DJANGO BARROU! MOTIVO:")
            print(serializer.errors)
            print("\n")
            
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        """
        Cria a evolução original e herda as especialidades
        """
        paciente = Paciente.objects.get(id=self.kwargs.get('paciente_id'))
        agendamento_id = self.request.data.get('agendamento')
        agendamento_obj = None
        especialidade_herdada = None

        if agendamento_id:
            try:
                agendamento_obj = Agendamento.objects.get(id=agendamento_id, paciente=paciente)
                if agendamento_obj.especialidade:
                    especialidade_herdada = agendamento_obj.especialidade
            except Agendamento.DoesNotExist:
                pass 
        
        if not especialidade_herdada:
            # Tenta pegar pelo nome técnico ou pelo nome direto enviado pelo React
            especialidade_nome_fornecida = self.request.data.get('especialidade_nome_fornecida') or self.request.data.get('especialidade')
            
            if especialidade_nome_fornecida and isinstance(especialidade_nome_fornecida, str):
                try:
                    especialidade_herdada = Especialidade.objects.get(nome__iexact=especialidade_nome_fornecida)
                except Especialidade.DoesNotExist:
                    pass

        serializer.save(
            medico=self.request.user, 
            paciente=paciente,
            agendamento=agendamento_obj,       
            especialidade=especialidade_herdada
        )

class EvolucaoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Evolucao.objects.all()
    serializer_class = EvolucaoSerializer
    permission_classes = [CanViewProntuario]

    # 👇 ADICIONE ESTA TRAVA PARA A EDIÇÃO (PATCH/PUT) 👇
    def perform_update(self, serializer):
        instance = self.get_object()
        # Verificamos se o médico logado é o mesmo que escreveu a evolução
        if instance.medico != self.request.user:
            raise PermissionDenied("Acesso Negado: Apenas o médico autor pode alterar esta evolução.")
        serializer.save()

    # 👇 ADICIONAR ESTE BLOCO PARA DEBUG 👇
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if not serializer.is_valid():
            print("\n🚨 ERRO 400 (EDITANDO EVOLUÇÃO) - O DJANGO BARROU! MOTIVO:")
            print(serializer.errors)
            print("\n")
            
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    # 👇 ADICIONE ESTA TRAVA PARA A EXCLUSÃO (DELETE) 👇
    def perform_destroy(self, instance):
        # Verificamos se o médico logado é o mesmo que escreveu a evolução
        if instance.medico != self.request.user:
            raise PermissionDenied("Acesso Negado: Você não tem permissão para apagar registros de outro profissional.")
        instance.delete()

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
    
    def get_permissions(self):
        if self.request.method == 'GET':
            # MUDANÇA AQUI: IsAuthenticated permite que a Recepção e Admin 
            # leiam a lista de documentos para poder enviá-los no chat.
            return [IsAuthenticated()]
        
        # Mantém a segurança estrita do sistema para quem tentar CRIAR (POST) um atestado
        return [CanCreateAtestado()]

    def get_queryset(self):
        # Tenta pegar o ID da URL (Novo) ou dos parâmetros de busca (Antigo)
        paciente_id = self.kwargs.get('paciente_id') or self.request.query_params.get('paciente')
        return Atestado.objects.filter(paciente__id=paciente_id).order_by('-data_emissao')

    def perform_create(self, serializer):
        # Tenta pegar o ID da URL (Novo) ou do corpo da requisição (Antigo)
        paciente_id = self.kwargs.get('paciente_id') or self.request.data.get('paciente')

        # Busca o paciente e salva
        paciente = Paciente.objects.get(id=paciente_id)
        # Quem não é médico só chega aqui com tipo_atestado 'Comparecimento' (checado em
        # CanCreateAtestado) — nesse caso o documento é assinado institucionalmente.
        serializer.save(
            medico=self.request.user,
            paciente=paciente,
            assinatura_institucional=self.request.user.cargo != 'medico'
        )

# --- ★★★ CORREÇÃO DO ERRO 500 ESTÁ AQUI ★★★ ---
# Substituímos 'generics.RetrieveUpdateAPIView' por 'APIView' para controle manual
class AnamneseDetailAPIView(APIView):
    """
    View para buscar (GET) ou atualizar (PATCH) a anamnese.
    Implementa manualmente o 'get_or_create' aninhado para evitar Erros 500.
    """
    permission_classes = [CanViewProntuario]
    serializer_class = AnamneseSerializer

    @transaction.atomic # Garante que as criações sejam atômicas
    def get_anamnese_object(self, paciente_id, request_user):
        """
        Função helper para buscar ou criar a anamnese e seus filhos.
        """
        obj, created = Anamnese.objects.get_or_create(
            paciente_id=paciente_id,
            defaults={'medico': request_user}
        )
        
        # Se a Anamnese principal ACABOU de ser criada (ou se falhou por algum motivo)
        # Garantimos que todos os filhos existam
        AnamneseGinecologica.objects.get_or_create(anamnese=obj)
        AnamneseOrtopedia.objects.get_or_create(anamnese=obj)
        AnamneseCardiologia.objects.get_or_create(anamnese=obj)
        AnamnesePediatria.objects.get_or_create(anamnese=obj)
        AnamneseNeonatologia.objects.get_or_create(anamnese=obj)
        AnamneseClinicaGeral.objects.get_or_create(anamnese=obj)
            
        return obj

    def get(self, request, paciente_id, *args, **kwargs):
        """
        Lida com a requisição GET (Carregar Histórico).
        """
        try:
            anamnese = self.get_anamnese_object(paciente_id, request.user)
            serializer = self.serializer_class(anamnese)
            return Response(serializer.data)
        except Paciente.DoesNotExist:
             return Response({"detail": "Paciente não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            # Captura outros erros inesperados durante o get/create
            return Response({"detail": f"Erro interno ao buscar anamnese: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def patch(self, request, paciente_id, *args, **kwargs):
        """
        Lida com a requisição PATCH (Salvar Histórico ou Resumo DNPM).
        """
        try:
            anamnese = self.get_anamnese_object(paciente_id, request.user)
            # 'partial=True' é o que define um PATCH (atualização parcial)
            serializer = self.serializer_class(anamnese, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            
            # Se a validação falhar, retorna o erro 400
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        except Paciente.DoesNotExist:
             return Response({"detail": "Paciente não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": f"Erro interno ao salvar anamnese: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, paciente_id, *args, **kwargs):
        """ Lida com a requisição PUT (substituição completa). """
        # Apenas redireciona para o PATCH, pois o serializer lida com 'partial=True'
        return self.patch(request, paciente_id, *args, **kwargs)

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
# --- NOSSA NOVA FUNÇÃO HELPER ---
# (Coloque isso logo antes das suas views de PDF)

def generate_pdf_response(template_path, context, filename_prefix='documento'):
    """
    Função helper com DEBUG LOGS para rastrear a assinatura digital.
    """
    print(f"\n--- INICIANDO GERAÇÃO DE PDF: {filename_prefix} ---")
    
    from datetime import date # Garante que a data está disponível
    
    clinica_info = Clinica.get_instance()
    logo_path = finders.find(clinica_info.logo) if clinica_info else None
    
    # 1. Busca Anamnese e Paciente
    anamnese_obj = None
    paciente = None
    if 'evolucao' in context: paciente = context['evolucao'].paciente
    elif 'atestado' in context: paciente = context['atestado'].paciente
    elif 'prescricao' in context: paciente = context['prescricao'].paciente
    elif 'relatorio' in context: paciente = context['relatorio'].paciente

    idade_formatada = "N/A"
    
    if paciente:
        try:
            anamnese_obj = Anamnese.objects.get(paciente=paciente)
        except Anamnese.DoesNotExist:
            anamnese_obj = None
            
        # Calcula a idade do paciente dinamicamente
        if paciente.data_nascimento:
            hoje = date.today()
            anos = hoje.year - paciente.data_nascimento.year - ((hoje.month, hoje.day) < (paciente.data_nascimento.month, paciente.data_nascimento.day))
            idade_formatada = f"{anos} ANOS"

    # 2. IDENTIFICAÇÃO DO MÉDICO
    medico_assinante = None
    if 'medico' in context:
        medico_assinante = context['medico']
    elif 'prescricao' in context:
        medico_assinante = context['prescricao'].medico
    elif 'atestado' in context:
        medico_assinante = context['atestado'].medico
    elif 'relatorio' in context:
        medico_assinante = context['relatorio'].medico
    elif 'evolucao' in context:
        medico_assinante = context['evolucao'].medico

    # 3. VERIFICAÇÃO DO CERTIFICADO E GERAÇÃO DE QR CODE
    tem_certificado_valido = False
    qr_code_data_url = ""
    logo_icp_data_url = ""

    if medico_assinante and hasattr(medico_assinante, 'certificado') and medico_assinante.certificado.arquivo_p12:
        tem_certificado_valido = True
        try:
            qr = qrcode.QRCode(version=1, box_size=4, border=0)
            qr.add_data("https://validar.iti.gov.br")
            qr.make(fit=True)
            img_qr = qr.make_image(fill_color="black", back_color="#f8f9fa")
            buffer_qr = io.BytesIO()
            img_qr.save(buffer_qr, format="PNG")
            qr_base64 = base64.b64encode(buffer_qr.getvalue()).decode("utf-8")
            qr_code_data_url = f"data:image/png;base64,{qr_base64}"

            caminho_logo = os.path.join(settings.BASE_DIR, 'static', 'images', 'logo_icp_brasil.png')
            if os.path.exists(caminho_logo):
                with open(caminho_logo, "rb") as image_file:
                    logo_base64 = base64.b64encode(image_file.read()).decode("utf-8")
                    logo_icp_data_url = f"data:image/png;base64,{logo_base64}"
        except Exception as e:
            print(f"DEBUG: Erro ao aceder ao certificado ou gerar QR/Logo: {e}")

    if 'medico' not in context and medico_assinante:
        context['medico'] = medico_assinante

    # NOVO FULL CONTEXT (Injetando a Idade e o Paciente)
    full_context = {
        'clinica': clinica_info,
        'anamnese': anamnese_obj,
        'paciente': paciente,
        'idade_formatada': idade_formatada,
        'tem_assinatura_digital': tem_certificado_valido, 
        'qr_code_base64_ou_url': qr_code_data_url, 
        'logo_icp_base64': logo_icp_data_url,      
        **context
    }
    # ==========================================================

    # 4. GERA O PDF DO CONTEÚDO (HTML -> PDF via xhtml2pdf)
    template = get_template(template_path)
    html = template.render(full_context)
    
    result = io.BytesIO()
    # Geramos o PDF do texto com fundo transparente
    pdf = pisa.pisaDocument(io.BytesIO(html.encode("UTF-8")), result)
    
    if not pdf.err:
        pdf_conteudo_bytes = result.getvalue()

        # ==========================================================
        # 5. A MÁGICA DA MÁSCARA (MERGE COM pypdf)
        # ==========================================================
        try:
            print("DEBUG: Aplicando máscara PDF da Clínica...")
            # ATENÇÃO: Defina onde você vai salvar o arquivo Receituario.pdf da agência.
            # Aqui estou assumindo que você colocou na raiz do projeto, numa pasta chamada 'static'
            caminho_mascara = os.path.join(settings.BASE_DIR, 'static', 'Receituario.pdf') 
            
            # --- NOVA SOLUÇÃO DE MEMÓRIA ---
            # 1. Carrega o arquivo do HD para a memória RAM uma ÚNICA vez
            with open(caminho_mascara, 'rb') as f_mascara:
                mascara_bytes = f_mascara.read()

            conteudo_reader = PdfReader(io.BytesIO(pdf_conteudo_bytes))
            writer = PdfWriter()

            # Itera por todas as páginas geradas pelo texto
            for i in range(len(conteudo_reader.pages)):
                pagina_conteudo = conteudo_reader.pages[i]
                
                # 2. Em vez de ler do HD (caminho_mascara), lê direto da RAM (mascara_bytes)
                mascara_reader_fresca = PdfReader(io.BytesIO(mascara_bytes))
                pagina_mascara_limpa = mascara_reader_fresca.pages[0]
                
                # Mescla e adiciona
                pagina_mascara_limpa.merge_page(pagina_conteudo)
                writer.add_page(pagina_mascara_limpa)

            # Salva o resultado mesclado em bytes
            merged_result = io.BytesIO()
            writer.write(merged_result)
            pdf_bytes_finais = merged_result.getvalue()
            print("DEBUG: Máscara aplicada com sucesso!")

        except Exception as e:
            print(f"DEBUG: ERRO ao aplicar máscara: {e}")
            print("DEBUG: Retornando PDF em branco por segurança.")
            # Se a máscara não for encontrada ou der erro, devolve o PDF feinho só com texto
            pdf_bytes_finais = pdf_conteudo_bytes

        # ==========================================================
        # 6. APLICA A ASSINATURA CRIPTOGRÁFICA (PyHanko)
        # ==========================================================
        if tem_certificado_valido:
            print("DEBUG: Assinando digitalmente...")
            pdf_bytes_assinado = assinar_pdf_digitalmente(pdf_bytes_finais, medico_assinante)
            if len(pdf_bytes_assinado) > len(pdf_bytes_finais):
                pdf_bytes_finais = pdf_bytes_assinado

        # 7. DEVOLVE A RESPOSTA
        response = HttpResponse(pdf_bytes_finais, content_type='application/pdf')
        response['Content-Disposition'] = f'filename="{filename_prefix}.pdf"'
        return response
        
    return HttpResponse('Ocorreu um erro ao gerar o PDF.', status=500)

# --- Views de Geração de PDF (AGORA REATORADAS) ---

class GerarPrescricaoPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, prescricao_id, *args, **kwargs):
        try:
            prescricao = Prescricao.objects.get(pk=prescricao_id)
        except Prescricao.DoesNotExist:
            return HttpResponse("Prescrição não encontrada.", status=404)
        
        # --- NOVA LÓGICA DE SEPARAÇÃO ---
        todos_itens = prescricao.itens.all()
        vias_enfermagem = ['Intramuscular', 'Intravenosa']
        
        # Divide em duas listas baseadas na via de administração
        itens_comuns = [item for item in todos_itens if item.via not in vias_enfermagem]
        itens_injetaveis = [item for item in todos_itens if item.via in vias_enfermagem]

        context = {
            'prescricao': prescricao,
            'itens_comuns': itens_comuns,
            'itens_injetaveis': itens_injetaveis,
        }
        
        filename = f'prescricao_{prescricao.paciente.nome_completo}_{prescricao.id}'
        
        return generate_pdf_response(
            'pdfs/prescricao_template.html', 
            context, 
            filename
        )


class GerarAtestadoPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, atestado_id, *args, **kwargs):
        try:
            atestado = Atestado.objects.get(pk=atestado_id)
        except Atestado.DoesNotExist:
            return HttpResponse("Atestado não encontrado.", status=404)

        # --- REPETE O PADRÃO ---
        context = {
            'atestado': atestado,
            'paciente': atestado.paciente, # Passando para usar no template
            'medico': atestado.medico,     # Passando para usar no template
        }
        filename = f'atestado_{atestado.paciente.nome_completo}_{atestado.id}'
        
        return generate_pdf_response(
            'pdfs/atestado_template.html', 
            context, 
            filename
        )


class GerarEvolucaoPDFView(APIView):
    permission_classes = [IsAuthenticated] # Ou CanViewProntuario

    def get(self, request, evolucao_id, *args, **kwargs):
        try:
            evolucao = Evolucao.objects.get(pk=evolucao_id)
        except Evolucao.DoesNotExist:
            return HttpResponse("Evolução não encontrada.", status=404)
        
        paciente = evolucao.paciente
        
        # 1. Busca Prontuário Mestre (Anamnese) - Sempre busca
        try:
            anamnese = Anamnese.objects.get(paciente=paciente)
        except Anamnese.DoesNotExist:
            anamnese = None
            
        # --- ★★★ LÓGICA CONDICIONAL ADICIONADA ★★★ ---
        
        # 2. Inicializa variáveis de especialidade
        marcos = []
        vacinas = []
        
        # 3. Verifica a especialidade da *consulta*
        especialidade_nome = None
        if evolucao.especialidade: # Verifica se a especialidade não é nula
            especialidade_nome = evolucao.especialidade.nome.lower() # Pega o nome, ex: "pediatria"

        # 4. Se for Pediatria OU Neonatologia, busca os dados
        if especialidade_nome == 'pediatria' or especialidade_nome == 'neonatologia':
            marcos = MarcoDNPM.objects.filter(paciente=paciente).order_by('data_registro')
            vacinas = VacinaPaciente.objects.filter(paciente=paciente).order_by('id')
        
        # --- FIM DA LÓGICA CONDICIONAL ---

        # 5. Monta o Contexto com todas as informações
        context = {
            'evolucao': evolucao,
            'paciente': paciente,
            'medico': evolucao.medico,
            'anamnese': anamnese,
            'marcos': marcos,   
            'vacinas': vacinas, 
        }
        
        filename = f'evolucao_{paciente.nome_completo}_{evolucao.id}'
        
        # 6. MÁGICA AQUI: Usamos a nossa nova função centralizada!
        # Sem precisar definir "full_context", "template.render" ou "pisaDocument" manualmente.
        return generate_pdf_response(
            'pdfs/evolucao_template.html', 
            context, 
            filename
        )

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
        especialidade_query = self.request.query_params.get('especialidade')
        
        if especialidade_query:
            # 1. Pega apenas a primeira palavra do nome da especialidade
            # Ex: "Cardiologia Adulto + ECG" vira "Cardiologia"
            palavra_chave = especialidade_query.split()[0]
            
            # 2. Usa __icontains para encontrar se a palavra_chave faz parte 
            # do que está salvo no banco de dados (ignorando maiúsculas/minúsculas)
            queryset = queryset.filter(
                models.Q(especialidade__icontains=palavra_chave) | 
                models.Q(especialidade__iexact='geral')
            )
            
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
            # Busca o CRM diretamente do modelo CustomUser
            crm = medico.crm 
            if not crm: # Verifica se o campo está em branco (None ou "")
                crm = "CRM NÃO INFORMADO"
        except AttributeError:
            # Este 'except' agora só pegaria se 'medico' não fosse um objeto válido
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

# --- NOVA VIEW PARA PDF DE RELATÓRIO ---
class GerarRelatorioPDFView(APIView):
    permission_classes = [IsAuthenticated] # Ou CanViewProntuario

    def get(self, request, relatorio_id, *args, **kwargs):
        try:
            relatorio = RelatorioSalvo.objects.get(pk=relatorio_id)
        except RelatorioSalvo.DoesNotExist:
            return HttpResponse("Relatório não encontrado.", status=404)

        context = {
            'relatorio': relatorio,
            'paciente': relatorio.paciente,
            'medico': relatorio.medico,
        }
        filename = f'relatorio_{relatorio.paciente.nome_completo}_{relatorio.id}'
        
        # Vamos criar este template 'relatorio_template.html' a seguir
        return generate_pdf_response(
            'pdfs/relatorio_template.html', 
            context, 
            filename
        )
    
class ArquivarRelatorioView(APIView):
    """
    Inativa (Soft Delete) um relatório salvo para que ele não apareça mais no prontuário,
    mas permaneça no banco de dados para auditoria.
    """
    permission_classes = [CanViewProntuario] # Protegido

    def post(self, request, pk):
        relatorio = get_object_or_404(RelatorioSalvo, pk=pk)
        
        # O médico só pode arquivar os próprios relatórios (opcional, mas recomendado)
        if relatorio.medico != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Você não tem permissão para arquivar o relatório de outro médico.")

        # Realiza o Soft Delete (Certifique-se de que o campo 'ativo' ou similar exista no modelo)
        relatorio.ativo = False 
        relatorio.save()
        
        return Response({"detail": "Relatório arquivado com sucesso."}, status=status.HTTP_200_OK)

# Adicione junto das outras views de geração de PDF
class GerarTermoConsentimentoPDFView(APIView):
    """
    Recebe via POST o nome e CRM do médico, busca os dados do paciente
    e gera o PDF do Termo de Consentimento usando a máscara padrão.
    """
    permission_classes = [IsAuthenticated] # Protegido para usuários logados

    def post(self, request, paciente_id, *args, **kwargs):
        try:
            paciente = Paciente.objects.get(pk=paciente_id)
        except Paciente.DoesNotExist:
            return Response({"erro": "Paciente não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # Captura os dados enviados pelo React
        medico_nome = request.data.get('medico_nome', '')
        medico_crm = request.data.get('medico_crm', '')

        context = {
            'paciente': paciente,
            'medico_nome': medico_nome,
            'medico_crm': medico_crm,
            # Se quiser forçar a assinatura digital do médico logado na máscara, 
            # passe a instância do request.user para o contexto:
            'medico': request.user 
        }
        
        filename = f'termo_consentimento_{paciente.nome_completo}'
        
        return generate_pdf_response(
            'pdfs/termo_consentimento.html', 
            context, 
            filename
        )

class ListarExamesDoPacienteView(generics.ListAPIView):
    """
    Lista todos os exames (com credenciais) de um paciente específico.
    Usado para preencher a tabela da aba 'Exames' e 'Credenciais'.
    """
    serializer_class = ExameSerializer
    permission_classes = [IsAuthenticated] # Ou CanViewProntuario

    def get_queryset(self):
        # Pega o ID do paciente da URL ?paciente_id=92
        paciente_id = self.request.query_params.get('paciente_id')
        if paciente_id:
            return Exame.objects.filter(paciente_id=paciente_id).order_by('-data_exame')
        return Exame.objects.none()

# --- BLINDAGEM 1: CRIAÇÃO DO LAUDO (POST) ---
class LaudoListCreateView(generics.ListCreateAPIView):
    serializer_class = LaudoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        paciente_id = self.request.query_params.get('paciente')
        
        queryset = Laudo.objects.select_related(
            'paciente', 'medico', 'exame'
        ).prefetch_related(
            'imagens', 'exame__arquivos'
        ).defer('dados_estruturados').order_by('-data_criacao')

        if paciente_id:
            return queryset.filter(paciente__id=paciente_id)
        return queryset

    def perform_create(self, serializer):
        import json
        import base64
        import re # <-- Importação necessária para regex
        from datetime import date
        from django.core.files.base import ContentFile
        
        paciente_id = self.request.data.get('paciente')
        paciente = get_object_or_404(Paciente, id=paciente_id)
        
        # 1. Tratar dados estruturados
        dados_raw = self.request.data.get('dados_estruturados', '{}')
        if isinstance(dados_raw, str):
            try:
                dados_dict = json.loads(dados_raw)
            except json.JSONDecodeError:
                dados_dict = {}
        else:
            dados_dict = dados_raw
            
        # Limpa imagens do JSON se vieram lá dentro por engano
        imagens_do_json = dados_dict.pop('imagens', [])

        # =========================================================================
        # NOVIDADE: ATUALIZAÇÃO AUTOMÁTICA DO CADASTRO DO PACIENTE
        # =========================================================================
        paciente_atualizado = False

        # Se o médico selecionou o Sexo no Laudo e o cadastro estava vazio
        sexo_laudo = dados_dict.get('sexo')
        if sexo_laudo and not paciente.genero:
            clean_sexo = str(sexo_laudo).strip().lower()
            if clean_sexo in ['masculino', 'm']:
                paciente.genero = 'Masculino'
            elif clean_sexo in ['feminino', 'f']:
                paciente.genero = 'Feminino'
            elif clean_sexo in ['outro', 'o']:
                paciente.genero = 'Outro'
            else:
                paciente.genero = sexo_laudo # Mantém a string enviada
            paciente_atualizado = True

        # Se o médico digitou a Idade no Laudo e a Data de Nascimento estava vazia
        idade_laudo = dados_dict.get('idade')
        if idade_laudo and not paciente.data_nascimento:
            # Extrai apenas os números da string (ex: "32 anos" -> 32)
            match = re.search(r'\d+', str(idade_laudo))
            if match:
                idade_num = int(match.group())
                ano_nascimento = date.today().year - idade_num
                # Salva como 1º de Janeiro do ano calculado
                paciente.data_nascimento = date(ano_nascimento, 1, 1)
                paciente_atualizado = True

        if paciente_atualizado:
            paciente.save()
            print(f"DEBUG: Dados do paciente {paciente.nome_completo} atualizados via Laudo.")
        # =========================================================================
        
        # 2. Salva o Laudo Básico com JSON leve
        laudo = serializer.save(
            medico=self.request.user, 
            paciente=paciente,
            tipo_exame=self.request.data.get('titulo', 'EXAME')[:50],
            dados_estruturados=dados_dict
        )

        # 3. Tratar as imagens anexadas (Convertendo a String do FormData)
        imagens_raw = self.request.data.get('imagens_anexas')
        imagens_lista = []
        
        if imagens_raw:
            if isinstance(imagens_raw, str):
                try:
                    imagens_lista = json.loads(imagens_raw)
                except json.JSONDecodeError:
                    pass
            elif isinstance(imagens_raw, list):
                imagens_lista = imagens_raw
        else:
            imagens_lista = imagens_do_json
            
        # 4. Salva as imagens individualmente (CORRIGIDO: Bloqueia duplicatas da nuvem)
        if imagens_lista:
            for index, img_str in enumerate(imagens_lista):
                try:
                    # VERIFICAÇÃO DO BUMERANGUE
                    is_cloud = False
                    if img_str.startswith("CLOUD:"):
                        is_cloud = True
                        img_str = img_str.replace("CLOUD:", "", 1)
                        
                    if is_cloud:
                        # Pula a criação no banco de dados para não gastar espaço no S3,
                        # pois o arquivo já existe na pasta do exame da máquina de USG!
                        continue

                    # Se chegou aqui, é upload manual do PC do médico (Salva normal)
                    if ";base64," in img_str:
                        format, imgstr = img_str.split(';base64,') 
                        ext = format.split('/')[-1]
                    else:
                        imgstr = img_str
                        ext = 'jpg'
                    data = base64.b64decode(imgstr)
                    file_name = f"laudo_{laudo.id}_img_{index}.{ext}"
                    
                    ImagemLaudo.objects.create(
                        laudo=laudo, 
                        arquivo=ContentFile(data, name=file_name)
                    )
                except Exception as e:
                    print(f"Erro ao salvar imagem {index}: {e}")

    def create(self, request, *args, **kwargs):
        from datetime import datetime, date, timedelta
        from django.utils.text import slugify

        # 1. Executa o salvamento básico (chama a perform_create acima)
        response = super().create(request, *args, **kwargs)
        laudo = Laudo.objects.get(id=response.data.get('id'))
        paciente = laudo.paciente
        titulo_base = laudo.titulo_exame

        # --- NOVIDADE: PARSE DA DATA RETROATIVA ---
        data_exame_str = request.data.get('data_exame')
        try:
            if data_exame_str:
                data_retroativa = datetime.strptime(data_exame_str, "%Y-%m-%d").date()
            else:
                data_retroativa = date.today()
        except ValueError:
            data_retroativa = date.today()
        # ------------------------------------------

        try:
            # --- 🛡️ CAMADA 1: AUDITORIA ANTI-FRAUDE E RETIFICAÇÃO ---
            laudo.titulo_exame = titulo_base

            # --- 🛡️ OTIMIZAÇÃO DE MEMÓRIA (ANTI-SIGKILL/OOM) ---
            # Carrega apenas os campos necessários, ignorando 'dados_estruturados' que tem megabytes de fotos antigas.
            laudos_anteriores = Laudo.objects.filter(
                paciente=paciente, 
                titulo_exame=titulo_base
            ).exclude(id=laudo.id).only('id', 'exame', 'status', 'arquivo_pdf')
            
            exame_herdado = None

            if laudos_anteriores.exists():
                for laudo_antigo in laudos_anteriores:
                    # 1. O novo laudo "rouba" o contêiner (Exame) do laudo antigo
                    if laudo_antigo.exame_id:
                        exame_herdado = laudo_antigo.exame
                        laudo_antigo.exame = None # Desvincula para sumir do portal
                    
                    # 2. Inativa o laudo antigo no prontuário
                    laudo_antigo.status = 'CANCELADO_POR_RETIFICACAO'
                    
                    # update_fields impede que o Django baixe o resto das colunas pesadas para salvar
                    laudo_antigo.save(update_fields=['exame', 'status'])
                    
                    # 3. Limpa o PDF velho de dentro do contêiner
                    if exame_herdado and laudo_antigo.arquivo_pdf:
                        try:
                            nome_arquivo_antigo = laudo_antigo.arquivo_pdf.name.split('/')[-1]
                            ArquivoExame.objects.filter(
                                exame=exame_herdado,
                                tipo='LAUDO',
                                arquivo__icontains=nome_arquivo_antigo
                            ).delete()
                        except Exception as e:
                            print(f"Erro ao limpar PDF antigo: {e}")
            # --------------------------------------------------------

            # --- 🛡️ CAMADA 2: VÍNCULO SEGURO COM EXAME E SENHAS ---
            exame = None
            
            if exame_herdado:
                # O laudo novo assume a mesma pasta e a mesma senha do antigo!
                exame = exame_herdado 
            else:
                # Se for um laudo totalmente novo (não retificado), roda a lógica original
                exame_id_front = request.data.get('exame')
                
                # Ignoramos os cancelados na hora de procurar contêineres ocupados
                exames_usados_ids = Laudo.objects.filter(
                    exame__isnull=False
                ).exclude(status='CANCELADO_POR_RETIFICACAO').values_list('exame_id', flat=True)

                if exame_id_front:
                    exame = Exame.objects.filter(id=exame_id_front).first()
                
                if not exame:
                    # 💡 NOVIDADE 1: Tenta achar o exame EXATO do dia (Compartilhamento)
                    # Sem ".exclude()", permitindo que 2 laudos no mesmo dia usem as mesmas fotos!
                    exame = Exame.objects.filter(
                        paciente=paciente, data_exame=data_retroativa
                    ).order_by('-criado_em').first()

                if not exame:
                    # 💡 NOVIDADE 2: O Fallback dos 15 dias 
                    # Aqui usamos o exclude para não "roubar" exames de outras semanas sem querer
                    limite_dias = data_retroativa - timedelta(days=15)
                    exame = Exame.objects.filter(
                        paciente=paciente, data_exame__gte=limite_dias
                    ).exclude(id__in=exames_usados_ids).order_by('-data_exame', '-criado_em').first()
                
                if not exame:
                    # 💡 NOVIDADE 3: Geração do exame vazio com UUID (Específico da AsyncView)
                    import uuid
                    nome_unico_pasta = f"{paciente.nome_completo} - L{laudo.id}"
                    exame = Exame.objects.create(
                        paciente=paciente, 
                        data_exame=data_retroativa,
                        nome_paciente_pasta=nome_unico_pasta, 
                        status='PENDENTE', # <--- 🚀 CORRIGIDO AQUI (antes era 'DISPONIVEL')
                        codigo_acesso=f"EX-{uuid.uuid4().hex[:8].upper()}" 
                    )

            # Salva o vínculo final
            laudo.exame = exame
            laudo.save()


            # --- 🛡️ CAMADA 3: NOMENCLATURA E APLICAÇÃO DA MÁSCARA ---
            if 'arquivo_pdf' in request.FILES:
                print("DEBUG [LAUDO]: PDF recebido do Front-end. Iniciando processo da Máscara...")
                from django.utils.text import slugify
                pdf_file = request.FILES['arquivo_pdf']

                # Usa a data retroativa no nome físico do arquivo
                data_hoje_str = data_retroativa.strftime("%d-%m-%Y")
                nome_base_arquivo = f"{laudo.titulo_exame}_{paciente.nome_completo}_{data_hoje_str}"

                try:
                    # =======================================================
                    # CRÍTICO: "Rebobina" o arquivo para o início antes de ler
                    pdf_file.seek(0) 
                    # =======================================================
                    
                    pdf_bytes_front = pdf_file.read()
                    
                    if len(pdf_bytes_front) == 0:
                        raise Exception("Os bytes do PDF do React chegaram vazios.")
                        
                    caminho_mascara = os.path.join(settings.BASE_DIR, 'static', 'Receituario.pdf') 
                    
                    # --- NOVA SOLUÇÃO DE MEMÓRIA ---
                    with open(caminho_mascara, 'rb') as f_mascara:
                        mascara_bytes = f_mascara.read()

                    conteudo_reader = PdfReader(io.BytesIO(pdf_bytes_front))
                    writer = PdfWriter()

                    print(f"DEBUG [LAUDO]: Mesclando {len(conteudo_reader.pages)} páginas...")
                    for i in range(len(conteudo_reader.pages)):
                        pagina_conteudo = conteudo_reader.pages[i]
                        
                        # Usa a versão carregada na RAM para não travar o Vercel
                        mascara_reader_fresca = PdfReader(io.BytesIO(mascara_bytes))
                        pagina_mascara_limpa = mascara_reader_fresca.pages[0]
                        
                        pagina_mascara_limpa.merge_page(pagina_conteudo)
                        writer.add_page(pagina_mascara_limpa)

                    merged_result = io.BytesIO()
                    writer.write(merged_result)
                    pdf_bytes_finais = merged_result.getvalue()
                    print("DEBUG [LAUDO]: Máscara (Receituario.pdf) aplicada com SUCESSO!")

                    medico_logado = request.user
                    if hasattr(medico_logado, 'certificado') and medico_logado.certificado.arquivo_p12:
                        print("DEBUG [LAUDO]: Aplicando assinatura digital ICP-Brasil...")
                        pdf_bytes_finais = assinar_pdf_digitalmente(pdf_bytes_finais, medico_logado)

                    pdf_file = ContentFile(pdf_bytes_finais, name=pdf_file.name)
                    
                except Exception as e:
                    print(f"DEBUG [LAUDO]: FALHA CRÍTICA na máscara ou assinatura: {e}")
                    # Retorna o arquivo original para não quebrar o sistema
                    pdf_file.seek(0)

                data_hoje_str = date.today().strftime("%d-%m-%Y")
                nome_base_arquivo = f"{laudo.titulo_exame}_{paciente.nome_completo}_{data_hoje_str}"
                nome_seguro = slugify(nome_base_arquivo).upper()
                extensao = pdf_file.name.split('.')[-1]
                pdf_file.name = f"{nome_seguro}.{extensao}"
                
                ArquivoExame.objects.create(
                    exame=exame,
                    arquivo=pdf_file,
                    tipo='LAUDO'
                )
                print(f"DEBUG [LAUDO]: Arquivo final salvo no disco como {pdf_file.name}")

            if exame.status == 'PENDENTE':
                exame.status = 'DISPONIVEL'
                exame.save()

            # --- PREPARANDO RESPOSTA PRO FRONTEND ---
            print("DEBUG [LAUDO]: Preparando link final para devolver ao React...")
            response.data['titulo_exame'] = laudo.titulo_exame
            response.data['credenciais'] = {
                'codigo': laudo.codigo_acesso, # Puxa o código PCT- do próprio Laudo
                'senha': laudo.senha_acesso,   # Puxa a senha do próprio Laudo
                'link': 'https://clinica-limale.vercel.app/resultados',
                'exame_id': exame.id if exame else None
            }
            from exames.serializers import ArquivoExameSerializer
            arquivos = exame.arquivos.all()
            if arquivos.exists():
                response.data['arquivos_vinculados'] = ArquivoExameSerializer(
                    arquivos, 
                    many=True,
                    context={'request': request} # <--- GARANTE A URL COMPLETA PRO DOWNLOAD
                ).data
                print("DEBUG [LAUDO]: Link enviado com sucesso. Operação concluída.")

        except Exception as e:
            print(f"DEBUG [LAUDO]: Erro crítico geral: {e}")

        return response

class AssinarArquivoPDFView(APIView):
    """
    Recebe um arquivo PDF via upload (multipart/form-data),
    assina com o certificado do usuário logado e retorna o PDF assinado.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        # 1. Verifica se veio arquivo
        if 'file' not in request.FILES:
            return Response({"error": "Nenhum arquivo enviado."}, status=400)
        
        arquivo = request.FILES['file']
        pdf_bytes = arquivo.read()
        
        # 2. Verifica se o médico tem certificado
        if not hasattr(request.user, 'certificado') or not request.user.certificado.arquivo_p12:
            return Response(
                {"error": "Médico não possui certificado digital configurado."}, 
                status=400
            )

        try:
            # 3. Chama nosso serviço de assinatura (que já criamos)
            # Como é um upload, o pdf_bytes está na memória
            pdf_assinado_bytes = assinar_pdf_digitalmente(pdf_bytes, request.user)
            
            # 4. Retorna o PDF binary direto para o navegador baixar/abrir
            response = HttpResponse(pdf_assinado_bytes, content_type='application/pdf')
            # Se quiser forçar download: response['Content-Disposition'] = 'attachment; filename="laudo_assinado.pdf"'
            # Se quiser abrir no navegador (inline):
            response['Content-Disposition'] = 'inline; filename="laudo_assinado.pdf"'
            
            return response

        except Exception as e:
            print(f"Erro ao assinar upload: {e}")
            return Response({"error": "Falha técnica ao assinar o PDF."}, status=500)

# --- BLINDAGEM 2: EDIÇÃO DO LAUDO (PUT/PATCH) ---
class LaudoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Permite Ler (GET), Atualizar (PUT/PATCH) e Deletar (DELETE) um laudo.
    BLINDADA para garantir que o PDF seja re-salvo na edição.
    """
    queryset = Laudo.objects.all()
    serializer_class = LaudoSerializer
    permission_classes = [IsAuthenticated]

    # 👇 ADICIONE ESTE BLOCO PARA BLINDAR A EDIÇÃO 👇
    def perform_update(self, serializer):
        laudo_atual = self.get_object() # Pega o laudo original do banco

        # 1. Trava de Autoria: Só o dono do laudo pode alterar
        if laudo_atual.medico != self.request.user:
            raise PermissionDenied("Você não tem permissão para editar o laudo de outro médico.")

        # 2. Trava Médico-Legal: Laudos finalizados são imutáveis
        if laudo_atual.status == 'FINALIZADO':
            raise ValidationError("Falha Médico-Legal: Este laudo já foi finalizado/assinado e não pode ser alterado.")

        # Se passou pelos seguranças, pode salvar
        serializer.save()

    # 👇 ADICIONE ESTE BLOCO PARA BLINDAR A EXCLUSÃO 👇
    def perform_destroy(self, instance):
        from rest_framework.exceptions import PermissionDenied
        
        # Trava de Autoria: Apenas o próprio médico pode excluir
        if instance.medico != self.request.user:
            raise PermissionDenied("Você não tem permissão para excluir o laudo de outro médico.")
        
        # Trava médico-legal removida. O médico agora tem autonomia para deletar o laudo.
        
        instance.delete() 

    def update(self, request, *args, **kwargs):
        # 1. Deixa o Django atualizar os textos e dados JSON
        response = super().update(request, *args, **kwargs)
        laudo = self.get_object()
        
        # 2. Se o frontend mandou um PDF novo por cima, salva com tag de Atualizado
        if 'arquivo_pdf' in request.FILES and laudo.exame:
            from datetime import date
            from django.utils.text import slugify
            
            pdf_file = request.FILES['arquivo_pdf']
            data_hoje_str = date.today().strftime("%d-%m-%Y")
            
            nome_base_arquivo = f"{laudo.titulo_exame}_{laudo.paciente.nome_completo}_{data_hoje_str}_ATUALIZADO"
            nome_seguro = slugify(nome_base_arquivo).upper()
            extensao = pdf_file.name.split('.')[-1]
            pdf_file.name = f"{nome_seguro}.{extensao}"
            
            ArquivoExame.objects.create(
                exame=laudo.exame,
                arquivo=pdf_file,
                tipo='LAUDO'
            )
            print(f"✅ PDF de Edição Salvo: {pdf_file.name}")
            
        return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buscar_credenciais_ativas(request):
    paciente_id = request.query_params.get('paciente_id')
    
    # LOG 1: Vendo se o ID chegou no servidor
    print(f"\n[DEBUG] === BUSCA DE CREDENCIAIS INICIADA ===")
    print(f"[DEBUG] ID do paciente recebido: {paciente_id}")
    
    if not paciente_id:
        print("[DEBUG] Falha: Nenhum ID de paciente fornecido.")
        return Response({'erro': 'ID do paciente não fornecido'}, status=400)
    
    # LOG 2: Vendo quantos laudos esse paciente tem (mesmo sem senha)
    total_laudos = Laudo.objects.filter(paciente_id=paciente_id).count()
    print(f"[DEBUG] Total de laudos encontrados no banco para o paciente {paciente_id}: {total_laudos}")
    
    # Tenta achar o laudo com código válido
    laudo = Laudo.objects.filter(
        paciente_id=paciente_id
    ).exclude(codigo_acesso='').exclude(codigo_acesso__isnull=True).order_by('-data_criacao').first()
    
    if laudo:
        print(f"[DEBUG] Sucesso! Laudo ID {laudo.id} selecionado. Código: {laudo.codigo_acesso}")
        return Response({
            'codigo': laudo.codigo_acesso,
            'senha': laudo.senha_acesso,
            'link': 'https://clinica-limale.vercel.app/resultados'
        })
    else:
        print(f"[DEBUG] Normal: paciente tem {total_laudos} laudo(s), mas nenhum possui 'codigo_acesso'.")
        # Retornamos 200 OK em vez de 404 para não gerar erro vermelho no console do navegador
        return Response({'aviso': 'Paciente ainda não possui credenciais.'}, status=200)

class AplicarMascaraPDFView(APIView):
    """
    Recebe um PDF transparente gerado pelo React (como a Agenda),
    aplica a máscara da clínica (Receituario.pdf) no fundo de todas as páginas,
    e devolve o arquivo PDF final na mesma hora (sem salvar no banco).
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        if 'arquivo_pdf' not in request.FILES:
            return Response({"error": "Nenhum arquivo PDF enviado."}, status=status.HTTP_400_BAD_REQUEST)
        
        pdf_file = request.FILES['arquivo_pdf']
        
        try:
            print("DEBUG [AGENDA]: Recebido PDF para aplicar máscara...")
            # Rebobina a leitura do arquivo por segurança
            pdf_file.seek(0)
            pdf_bytes_front = pdf_file.read()
            
            if len(pdf_bytes_front) == 0:
                raise Exception("O arquivo PDF do frontend chegou vazio.")
            
            # Caminho da nossa máscara oficial
            caminho_mascara = os.path.join(settings.BASE_DIR, 'static', 'Receituario.pdf')
            
            # --- NOVA SOLUÇÃO DE MEMÓRIA ---
            with open(caminho_mascara, 'rb') as f_mascara:
                mascara_bytes = f_mascara.read()

            conteudo_reader = PdfReader(io.BytesIO(pdf_bytes_front))
            writer = PdfWriter()
            
            print(f"DEBUG [AGENDA]: Mesclando {len(conteudo_reader.pages)} página(s)...")
            
            for i in range(len(conteudo_reader.pages)):
                pagina_conteudo = conteudo_reader.pages[i]
                
                # Lemos direto da memória para alívio do servidor
                mascara_reader_fresca = PdfReader(io.BytesIO(mascara_bytes))
                pagina_mascara_limpa = mascara_reader_fresca.pages[0]
                
                # A máscara fica no fundo, a tabela da agenda por cima
                pagina_mascara_limpa.merge_page(pagina_conteudo)
                writer.add_page(pagina_mascara_limpa)
                
            merged_result = io.BytesIO()
            writer.write(merged_result)
            pdf_bytes_finais = merged_result.getvalue()
            
            print("DEBUG [AGENDA]: Máscara aplicada com SUCESSO!")
            
            # Devolve o PDF binário diretamente para o navegador abrir
            response = HttpResponse(pdf_bytes_finais, content_type='application/pdf')
            response['Content-Disposition'] = 'inline; filename="agenda_timbrada.pdf"'
            return response
            
        except Exception as e:
            print(f"DEBUG [AGENDA]: Falha ao aplicar máscara: {e}")
            # Em caso de erro (ex: não achou o Receituario.pdf), 
            # devolve o arquivo original transparente para não travar a recepção
            pdf_file.seek(0)
            response = HttpResponse(pdf_file.read(), content_type='application/pdf')
            response['Content-Disposition'] = 'inline; filename="agenda_original.pdf"'
            return response

# prontuario/views.py

class LaudoCreateAsyncView(generics.CreateAPIView):
    """
    Nova View para criação assíncrona CLONADA da view original.
    Garante que todo o ecossistema (senhas, pastas, anti-fraude) 
    seja gerado na hora, terceirizando APENAS o PDF para o Celery.
    """
    serializer_class = LaudoSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        import json
        import base64
        import re
        from datetime import date
        from django.core.files.base import ContentFile
        from rest_framework.exceptions import ValidationError, AuthenticationFailed
        from usuarios.models import CustomUser
        from prontuario.models import ImagemLaudo
        
        paciente_id = self.request.data.get('paciente')
        paciente = get_object_or_404(Paciente, id=paciente_id)
        
        # =========================================================================
        # 1. AUTORIZAÇÃO DA ASSINATURA PELO MÉDICO (BLINDADA)
        # =========================================================================
        crm_enviado = self.request.data.get('crm_medico')
        senha_enviada = self.request.data.get('senha_medico')
        
        if not crm_enviado or str(crm_enviado).strip() in ['', 'null', 'undefined']:
            raise ValidationError({"detail": "O CRM do médico está vazio. Selecione o médico na lista sugerida antes de finalizar o laudo."})
        
        if not senha_enviada:
            raise ValidationError({"detail": "A senha do médico é obrigatória para assinar o laudo."})
            
        medico_assinante = CustomUser.objects.filter(crm=crm_enviado, cargo='medico').first()
        
        if not medico_assinante:
            raise ValidationError({"detail": f"Nenhum médico encontrado com o CRM '{crm_enviado}' no sistema."})
            
        if not medico_assinante.check_password(senha_enviada):
            raise ValidationError({"detail": "Senha incorreta. A assinatura do laudo não foi autorizada."})
            
        print(f"\n[DEBUG 1] 🟢 MÉDICO VALIDADO COM SUCESSO! Assinante: {medico_assinante.get_full_name()} (CRM: {medico_assinante.crm})")

        # =========================================================================
        # 2. TRATAR DADOS ESTRUTURADOS E ATUALIZAR PACIENTE
        # =========================================================================
        dados_raw = self.request.data.get('dados_estruturados', '{}')
        if isinstance(dados_raw, str):
            try:
                dados_dict = json.loads(dados_raw)
            except json.JSONDecodeError:
                dados_dict = {}
        else:
            dados_dict = dados_raw
            
        imagens_do_json = dados_dict.pop('imagens', [])

        paciente_atualizado = False
        sexo_laudo = dados_dict.get('sexo')
        if sexo_laudo and not paciente.genero:
            clean_sexo = str(sexo_laudo).strip().lower()
            if clean_sexo in ['masculino', 'm']:
                paciente.genero = 'Masculino'
            elif clean_sexo in ['feminino', 'f']:
                paciente.genero = 'Feminino'
            elif clean_sexo in ['outro', 'o']:
                paciente.genero = 'Outro'
            else:
                paciente.genero = sexo_laudo
            paciente_atualizado = True

        idade_laudo = dados_dict.get('idade')
        if idade_laudo and not paciente.data_nascimento:
            match = re.search(r'\d+', str(idade_laudo))
            if match:
                idade_num = int(match.group())
                ano_nascimento = date.today().year - idade_num
                paciente.data_nascimento = date(ano_nascimento, 1, 1)
                paciente_atualizado = True

        if paciente_atualizado:
            paciente.save()

        # =========================================================================
        # 3. SALVAR O LAUDO E APLICAR O OVERRIDE DE AUTORIA
        # =========================================================================
        laudo = serializer.save(
            paciente=paciente,
            tipo_exame=self.request.data.get('titulo', 'EXAME')[:50],
            dados_estruturados=dados_dict,
            status='PROCESSANDO'
        )
        
        print(f"[DEBUG 2] 🟡 ANTES DO OVERRIDE: O DRF tentou salvar o laudo no nome de: {laudo.medico.username}")
        
        # A MÁGICA: Substitui o dono que o DRF escolheu pelo médico da senha validada
        laudo.medico = medico_assinante
        laudo.save(update_fields=['medico'])
        
        print(f"[DEBUG 3] 🟢 DEPOIS DO OVERRIDE: O laudo {laudo.id} pertence DE FATO a: {laudo.medico.get_full_name()}\n")

        # =========================================================================
        # 4. SALVAR IMAGENS ANEXAS (COM VERIFICAÇÃO DO BUMERANGUE RESTAURADA)
        # =========================================================================
        imagens_raw = self.request.data.get('imagens_anexas')
        imagens_lista = []
        if imagens_raw:
            if isinstance(imagens_raw, str):
                try:
                    imagens_lista = json.loads(imagens_raw)
                except json.JSONDecodeError:
                    pass
            elif isinstance(imagens_raw, list):
                imagens_lista = imagens_raw
        else:
            imagens_lista = imagens_do_json
            
        if imagens_lista:
            for index, img_str in enumerate(imagens_lista):
                try:
                    # VERIFICAÇÃO DO BUMERANGUE (Intacta do original)
                    is_cloud = False
                    if img_str.startswith("CLOUD:"):
                        is_cloud = True
                        img_str = img_str.replace("CLOUD:", "", 1)
                        
                    if is_cloud:
                        # Pula a criação no banco de dados para não gastar espaço no S3,
                        # pois o arquivo já existe na pasta do exame da máquina de USG!
                        continue

                    # Se chegou aqui, é upload manual do PC do médico (Salva normal)
                    if ";base64," in img_str:
                        format, imgstr = img_str.split(';base64,') 
                        ext = format.split('/')[-1]
                    else:
                        imgstr = img_str
                        ext = 'jpg'
                    data = base64.b64decode(imgstr)
                    file_name = f"laudo_{laudo.id}_img_{index}.{ext}"
                    
                    ImagemLaudo.objects.create(
                        laudo=laudo, 
                        arquivo=ContentFile(data, name=file_name)
                    )
                except Exception as e:
                    print(f"Erro ao salvar imagem {index}: {e}")

    def create(self, request, *args, **kwargs):
        from datetime import date, timedelta, datetime
        from django.utils.text import slugify
        
        response = super().create(request, *args, **kwargs)
        laudo = Laudo.objects.get(id=response.data.get('id'))
        paciente = laudo.paciente
        titulo_base = laudo.titulo_exame

        # --- NOVIDADE: PARSE DA DATA RETROATIVA ---
        data_exame_str = request.data.get('data_exame')
        try:
            if data_exame_str:
                data_retroativa = datetime.strptime(data_exame_str, "%Y-%m-%d").date()
            else:
                data_retroativa = date.today()
        except ValueError:
            data_retroativa = date.today()
        # ------------------------------------------

        try:
            # --- 🛡️ CAMADA 1: AUDITORIA ANTI-FRAUDE E RETIFICAÇÃO ---
            laudo.titulo_exame = titulo_base

            # --- 🛡️ OTIMIZAÇÃO DE MEMÓRIA (ANTI-SIGKILL/OOM) ---
            # Carrega apenas os campos necessários, ignorando 'dados_estruturados' que tem megabytes de fotos antigas.
            laudos_anteriores = Laudo.objects.filter(
                paciente=paciente, 
                titulo_exame=titulo_base
            ).exclude(id=laudo.id).only('id', 'exame', 'status', 'arquivo_pdf')
            
            exame_herdado = None

            if laudos_anteriores.exists():
                for laudo_antigo in laudos_anteriores:
                    # 1. O novo laudo "rouba" o contêiner (Exame) do laudo antigo
                    if laudo_antigo.exame_id:
                        exame_herdado = laudo_antigo.exame
                        laudo_antigo.exame = None # Desvincula para sumir do portal
                    
                    # 2. Inativa o laudo antigo no prontuário
                    laudo_antigo.status = 'CANCELADO_POR_RETIFICACAO'
                    
                    # update_fields impede que o Django baixe o resto das colunas pesadas para salvar
                    laudo_antigo.save(update_fields=['exame', 'status'])
                    
                    # 3. Limpa o PDF velho de dentro do contêiner
                    if exame_herdado and laudo_antigo.arquivo_pdf:
                        try:
                            nome_arquivo_antigo = laudo_antigo.arquivo_pdf.name.split('/')[-1]
                            ArquivoExame.objects.filter(
                                exame=exame_herdado,
                                tipo='LAUDO',
                                arquivo__icontains=nome_arquivo_antigo
                            ).delete()
                        except Exception as e:
                            print(f"Erro ao limpar PDF antigo: {e}")
            # --------------------------------------------------------

            # --- 🛡️ CAMADA 2: VÍNCULO SEGURO COM EXAME E SENHAS ---
            exame = None
            
            if exame_herdado:
                exame = exame_herdado 
            else:
                exame_id_front = request.data.get('exame')
                exames_usados_ids = Laudo.objects.filter(
                    exame__isnull=False
                ).exclude(status='CANCELADO_POR_RETIFICACAO').values_list('exame_id', flat=True)

                if exame_id_front:
                    exame = Exame.objects.filter(id=exame_id_front).first()
                
                if not exame:
                    # 💡 NOVIDADE 1: Compartilhamento de Exame no mesmo dia
                    exame = Exame.objects.filter(
                        paciente=paciente, data_exame=data_retroativa
                    ).order_by('-criado_em').first()

                if not exame:
                    # 💡 NOVIDADE 2: Fallback 15 dias
                    limite_dias = data_retroativa - timedelta(days=15)
                    exame = Exame.objects.filter(
                        paciente=paciente, data_exame__gte=limite_dias
                    ).exclude(id__in=exames_usados_ids).order_by('-data_exame', '-criado_em').first()
                
                if not exame:
                    # 💡 NOVIDADE 3: Geração do exame vazio com UUID (Específico da AsyncView)
                    import uuid
                    nome_unico_pasta = f"{paciente.nome_completo} - L{laudo.id}"
                    exame = Exame.objects.create(
                        paciente=paciente, 
                        data_exame=data_retroativa,
                        nome_paciente_pasta=nome_unico_pasta, 
                        status='DISPONIVEL',
                        codigo_acesso=f"EX-{uuid.uuid4().hex[:8].upper()}" 
                    )

            # Salva o vínculo final
            laudo.exame = exame
            laudo.save()
            
            # --- 🛡️ CAMADA 3: SALVAR PDF TRANSPARENTE E DISPARAR CELERY ---
            if 'arquivo_pdf' in request.FILES:
                # [MANTIDO: Se o React enviar o PDF, usamos o dele]
                pdf_file = request.FILES['arquivo_pdf']
                data_hoje_str = data_retroativa.strftime("%d-%m-%Y")
                nome_base_arquivo = f"{laudo.titulo_exame}_{paciente.nome_completo}_{data_hoje_str}"
                nome_seguro = slugify(nome_base_arquivo).upper()
                extensao = pdf_file.name.split('.')[-1]
                pdf_file.name = f"{nome_seguro}.{extensao}"
                laudo.arquivo_pdf = pdf_file
                
            else:
                # ====================================================================
                # 🚀 TRANSIÇÃO SEGURA: GERAÇÃO DE PDF NO BACKEND
                # ====================================================================
                import json
                from datetime import date
                from django.core.files.base import ContentFile
                
                # 1. IMPORTAMOS AS DUAS VERSÕES (V1 e V2)
                from prontuario.utils import gerar_pdf_laudo_backend 
                from prontuario.utilsv2 import gerar_pdf_laudo_backend_v2

                imagens_raw = request.data.get('imagens_anexas', '[]')
                try:
                    imagens_raw_parsed = json.loads(imagens_raw) if isinstance(imagens_raw, str) else imagens_raw
                except:
                    imagens_raw_parsed = []

                # LIMPEZA DA FLAG PARA O PDF FUNCIONAR
                imagens_lista = []
                for img in imagens_raw_parsed:
                    if isinstance(img, str) and img.startswith("CLOUD:"):
                        imagens_lista.append(img.replace("CLOUD:", "", 1))
                    else:
                        imagens_lista.append(img)

                idade_formatada = ""
                if paciente.data_nascimento:
                    hoje = date.today()
                    anos = hoje.year - paciente.data_nascimento.year - ((hoje.month, hoje.day) < (paciente.data_nascimento.month, paciente.data_nascimento.day))
                    idade_formatada = f"{anos} ANOS"

                contexto = {
                    'laudo': laudo,
                    'paciente': paciente,
                    'medico': laudo.medico,
                    'data_exame': data_retroativa,
                    'idade_formatada': idade_formatada,
                    'imagens': imagens_lista
                }

                print("\n=== DEBUG BACKEND 2: PREPARANDO CONTEXTO DO PDF ===")
                print(f"Laudo ID salvo: {laudo.id}")
                print(f"Paciente injetado no PDF: {paciente.nome_completo}")
                print("====================================================\n")

                # 2. O DESVIO INTELIGENTE: Lê a tag enviada pelo React
                versao_laudo = request.data.get('versao_laudo', 'v1')
                
                if versao_laudo == 'v2':
                    print("DEBUG [LAUDO]: 🚀 Roteando para Motor V2 (utilsv2.py)")
                    pdf_bytes = gerar_pdf_laudo_backend_v2(contexto)
                else:
                    print("DEBUG [LAUDO]: 🔙 Roteando para Motor V1 Clássico (utils.py)")
                    pdf_bytes = gerar_pdf_laudo_backend(contexto)
                
                if pdf_bytes:
                    data_hoje_str = data_retroativa.strftime("%d-%m-%Y")
                    nome_base_arquivo = f"{laudo.titulo_exame}_{paciente.nome_completo}_{data_hoje_str}"
                    nome_seguro = slugify(nome_base_arquivo).upper()
                    
                    laudo.arquivo_pdf = ContentFile(pdf_bytes, name=f"{nome_seguro}.pdf")
                # ====================================================================
            
            laudo.save()
            
            # --- A MÁGICA: PROCESSAMENTO EM SEGUNDO PLANO BLINDADO ---
            import threading
            from django.db import transaction # Adicione esta importação no topo do arquivo se já não tiver
            from .tasks import processar_laudo_background
            
            # Só inicia a Thread APÓS o commit final no banco de dados (evita Race Condition)
            transaction.on_commit(lambda: processar_laudo_background.delay(laudo.id))
            
            print(f"[API] Laudo {laudo.id} programado para Thread em background.")

            # >>> ADICIONE ESTES LOGS DE CREDENCIAIS <<<
            print("\n=== DEBUG CREDENCIAIS (BACKEND) ===")
            print(f"Laudo ID: {laudo.id} | Paciente: {paciente.nome_completo}")
            print(f"Código Gerado: {laudo.codigo_acesso}")
            print(f"Senha Gerada: {laudo.senha_acesso}")
            print("=====================================\n")

            # --- PREPARANDO RESPOSTA PRO FRONTEND ---
            # Devolvemos as credenciais NA HORA para o React não quebrar o WhatsApp
            response.data['titulo_exame'] = laudo.titulo_exame
            response.data['credenciais'] = {
                'codigo': laudo.codigo_acesso, # Puxa o código PCT- do próprio Laudo
                'senha': laudo.senha_acesso,   # Puxa a senha do próprio Laudo
                'link': 'https://clinica-limale.vercel.app/resultados',
                'exame_id': exame.id if exame else None
            }
            
            response.status_code = status.HTTP_202_ACCEPTED

        except Exception as e:
            print(f"DEBUG [LAUDO ASYNC]: Erro crítico geral: {e}")
            # Muda o status para erro para o polling do React parar e avisar o médico
            laudo.status = 'ERRO'
            laudo.save()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return response

class LaudoStatusView(APIView):
    """
    Endpoint para o React fazer 'polling'.
    Retorna se o laudo já foi finalizado ou se deu erro.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        laudo = get_object_or_404(Laudo, pk=pk)
        
        data = {
            "id": laudo.id,
            "status": laudo.status,
            "arquivo_url": laudo.arquivo_pdf.url if laudo.status == 'FINALIZADO' and laudo.arquivo_pdf else None,
            "discrepancias": laudo.feedback_auditoria if laudo.status == 'REVISAO_SUGERIDA' else []
        }
        
        # Se finalizou, incluímos as credenciais para o portal
        if laudo.status == 'FINALIZADO':
            data["credenciais"] = {
                "codigo": laudo.codigo_acesso,
                "senha": laudo.senha_acesso,
                "link": "[https://clinica-limale.vercel.app/resultados](https://clinica-limale.vercel.app/resultados)"
            }
            
        return Response(data)

class PatientBannerAPIView(APIView):
    """
    Endpoint (GET): /api/prontuario/workspace/banner/<paciente_id>/
    Retorna os dados vitais e de cadastro para a barra superior congelada.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, paciente_id):
        # 1. Pega os dados mestre do paciente
        paciente = get_object_or_404(Paciente, id=paciente_id)
        
        # 2. Busca a última evolução para puxar a Pressão (PA) e Frequência Cardíaca (FC)
        # Ajuste os nomes dos campos de acordo com o que você criou no seu models.py da Evolucao
        ultima_evolucao = Evolucao.objects.filter(paciente=paciente).order_by('-data_atendimento').first()
        
        # Lógica: Tenta pegar da evolução. Se não tiver evolução, fica 'N/A'
        pa = getattr(ultima_evolucao, 'pressao_arterial', 'N/A') if ultima_evolucao else 'N/A'
        fc = getattr(ultima_evolucao, 'frequencia_cardiaca', 'N/A') if ultima_evolucao else 'N/A'
        
        # O Peso e Altura vêm sempre do cadastro do Paciente (que o SOAP acabou de atualizar)
        peso = f"{paciente.peso} kg" if paciente.peso else 'N/A'

        # NOVA LINHA: Buscando a altura
        altura = f"{paciente.altura} cm" if paciente.altura else 'N/A'

        # Calcula a idade exata (opcional, se você já tiver um método no model, use-o)
        from datetime import date
        idade_formatada = "Indisponível"
        if paciente.data_nascimento:
            hoje = date.today()
            anos = hoje.year - paciente.data_nascimento.year - ((hoje.month, hoje.day) < (paciente.data_nascimento.month, paciente.data_nascimento.day))
            idade_formatada = f"{anos} anos"

        data = {
            'id': paciente.id,
            'nome_completo': paciente.nome_completo,
            'data_nascimento': paciente.data_nascimento, # O backend manda AAAA-MM-DD, o React formata
            'genero': paciente.genero,
            'idade_formatada': idade_formatada,
            'sinais_vitais': {
                'pa': pa or 'N/A',
                'fc': fc or 'N/A',
                'peso': peso,
                'altura': altura  # NOVA LINHA AQUI
            }
        }
        return Response(data)


class MeusPacientesWorkspaceAPIView(generics.ListAPIView):
    """
    Endpoint (GET): /api/prontuario/workspace/meus-pacientes/
    Alimenta a aba "Pacientes" da coluna esquerda, listando pacientes que o médico já atendeu.
    """
    serializer_class = WorkspacePacienteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        medico = self.request.user
        # Filtra IDs de pacientes que têm evoluções com o médico logado (sem repetições)
        pacientes_ids = Evolucao.objects.filter(medico=medico).values_list('paciente_id', flat=True).distinct()
        return Paciente.objects.filter(id__in=pacientes_ids).order_by('nome_completo')


class ConsultasWorkspaceAPIView(APIView):
    """
    Endpoint (GET): /api/prontuario/workspace/minhas-consultas/
    Alimenta a aba "Consultas" da coluna esquerda (Ordem Cronológica do Dia).
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from datetime import date
        from django.utils import timezone # ---> ADICIONADO AQUI
        
        hoje = date.today()
        medico = request.user
        
        # Filtra os agendamentos de hoje para o médico logado
        agendamentos = Agendamento.objects.filter(
            medico=medico, 
            data_hora_inicio__date=hoje
        ).order_by('data_hora_inicio')
        
        data = []
        for ag in agendamentos:
            # ---> A CORREÇÃO ESTÁ NESTAS DUAS LINHAS <---
            # Converte de UTC para o fuso local configurado em settings (America/Sao_Paulo)
            horario_local = timezone.localtime(ag.data_hora_inicio)
            
            data.append({
                "id": ag.id,
                "paciente_id": ag.paciente.id,
                "paciente_nome": ag.paciente.nome_completo,
                "horario": horario_local.strftime('%H:%M'), # ---> USANDO O LOCALTIME AQUI
                "especialidade": ag.especialidade.nome if ag.especialidade else "Geral",
                "status": ag.status
            })
        return Response(data)

class ModeloPrescricaoListCreateView(generics.ListCreateAPIView):
    """
    Lista os modelos salvos do médico logado e permite criar novos.
    """
    serializer_class = ModeloPrescricaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # MÁGICA AQUI: Puxa o ID direto do Token de segurança do usuário logado!
        return ModeloPrescricao.objects.filter(medico=self.request.user).order_by('titulo')

    def perform_create(self, serializer):
        serializer.save(medico=self.request.user)

class ModeloPrescricaoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Permite Ler (GET), Atualizar (PUT/PATCH) ou Apagar (DELETE) um modelo de prescrição.
    """
    serializer_class = ModeloPrescricaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Proteção de Autoria: O médico só enxerga, edita e deleta os próprios modelos
        return ModeloPrescricao.objects.filter(medico=self.request.user)

class RegerarLaudoPDFView(APIView):
    """
    Rota de resgate: Pega o JSON do laudo e força o backend a montar o PDF,
    buscando as imagens do banco, aplicando a máscara e a Assinatura Digital.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, laudo_id, *args, **kwargs):
        import traceback
        try:
            import io
            import os
            import base64
            from datetime import date
            from django.core.files.base import ContentFile
            from django.conf import settings
            from pypdf import PdfReader, PdfWriter
            from django.utils.text import slugify
            
            from prontuario.utils import gerar_pdf_laudo_backend
            from core.services_assinatura import assinar_pdf_digitalmente
            from prontuario.models import Laudo, ImagemLaudo

            laudo = Laudo.objects.get(pk=laudo_id)

            idade_formatada = ""
            if laudo.paciente and laudo.paciente.data_nascimento:
                hoje = date.today()
                nasc = laudo.paciente.data_nascimento
                anos = hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))
                idade_formatada = f"{anos} ANOS"

            # 1. RESGATA IMAGENS COM LEITURA SEGURA DE NUVEM
            imagens_base64 = []
            imagens_do_banco = ImagemLaudo.objects.filter(laudo=laudo).order_by('id')
            
            for img in imagens_do_banco:
                try:
                    if img.arquivo:
                        # Abre explicitamente em modo binário (Crucial para S3/Supabase)
                        with img.arquivo.open('rb') as f:
                            img_bytes = f.read()
                            
                        ext = img.arquivo.name.split('.')[-1].lower()
                        mime = 'image/png' if ext == 'png' else 'image/jpeg'
                        encoded = base64.b64encode(img_bytes).decode('utf-8')
                        imagens_base64.append(f"data:{mime};base64,{encoded}")
                except Exception as e:
                    print(f"DEBUG: Erro ao carregar imagem {img.id}: {e}")

            # 2. GERA PDF TRANSPARENTE
            contexto = {
                'laudo': laudo,
                'paciente': laudo.paciente,
                'medico': laudo.medico,
                'data_exame': laudo.data_criacao,
                'idade_formatada': idade_formatada,
                'imagens': imagens_base64
            }

            pdf_bytes_transparente = gerar_pdf_laudo_backend(contexto)

            if not pdf_bytes_transparente:
                return Response({'erro': 'Falha do gerador HTML para PDF. As imagens originais podem estar muito pesadas ou corrompidas.'}, status=500)

            pdf_bytes_finais = pdf_bytes_transparente

            # 3. APLICA MÁSCARA
            try:
                caminho_mascara = os.path.join(settings.BASE_DIR, 'static', 'Receituario.pdf')
                with open(caminho_mascara, 'rb') as f_mascara:
                    mascara_bytes = f_mascara.read()

                conteudo_reader = PdfReader(io.BytesIO(pdf_bytes_transparente))
                writer = PdfWriter()

                for i in range(len(conteudo_reader.pages)):
                    pagina_conteudo = conteudo_reader.pages[i]
                    mascara_reader_fresca = PdfReader(io.BytesIO(mascara_bytes))
                    pagina_mascara_limpa = mascara_reader_fresca.pages[0]
                    
                    pagina_mascara_limpa.merge_page(pagina_conteudo)
                    writer.add_page(pagina_mascara_limpa)

                merged_result = io.BytesIO()
                writer.write(merged_result)
                pdf_bytes_finais = merged_result.getvalue()
            except Exception as e:
                print(f"DEBUG [RESGATE]: Erro ao aplicar máscara: {e}")

            # 4. ASSINATURA DIGITAL
            medico_logado = request.user
            if hasattr(medico_logado, 'certificado') and medico_logado.certificado.arquivo_p12:
                try:
                    pdf_bytes_finais = assinar_pdf_digitalmente(pdf_bytes_finais, medico_logado)
                except Exception as e:
                    print(f"DEBUG [RESGATE]: Erro ao assinar: {e}")

            # 5. SALVA
            nome_arquivo = f"laudo_regerado_{laudo.titulo_exame}_{laudo.paciente.nome_completo}.pdf"
            nome_seguro = f"{slugify(nome_arquivo)}.pdf"

            laudo.arquivo_pdf.save(nome_seguro, ContentFile(pdf_bytes_finais), save=True)
            laudo.status = 'FINALIZADO'
            laudo.save()

            return Response({'arquivo_url': laudo.arquivo_pdf.url})

        except Laudo.DoesNotExist:
            return Response({'erro': 'Laudo não encontrado no banco de dados.'}, status=404)
        except Exception as e:
            # Captura QUALQUER erro e devolve em texto limpo!
            erro_trace = traceback.format_exc()
            print(f"ERRO FATAL NA ROTA DE RESGATE:\n{erro_trace}")
            return Response({'erro': f"Erro interno do Python: {str(e)}"}, status=500)