# backend/prontuario/views.py - VERSÃO FINAL COM PERMISSÕES CORRIGIDAS

from io import BytesIO
import io
import os
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
from xhtml2pdf import pisa
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
from .serializers import LaudoSerializer

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

# --- ★★★ REVERTEMOS PARA A VIEW ÚNICA ★★★ ---
# (Delete todas as classes BaseEvolucaoCreateAPIView e suas filhas)

class EvolucaoListCreateAPIView(generics.ListCreateAPIView):
    """
    View ÚNICA para Listar (GET) e Criar (POST) evoluções.
    """
    serializer_class = EvolucaoSerializer
    permission_classes = [CanViewProntuario]

    def get_queryset(self):
        """ Lista evoluções do paciente (sem mudança) """
        paciente_id = self.kwargs.get('paciente_id')
        return Evolucao.objects.filter(paciente__id=paciente_id).order_by('-data_atendimento')

    def perform_create(self, serializer):
        """
        Cria a evolução e HERDA A ESPECIALIDADE do agendamento.
        """
        paciente = Paciente.objects.get(id=self.kwargs.get('paciente_id'))
        
        # --- LÓGICA DE HERANÇA (ATUALIZADA) ---
        agendamento_id = self.request.data.get('agendamento')
        agendamento_obj = None
        especialidade_herdada = None

        # 1. Tenta pegar a especialidade do Agendamento (como antes)
        if agendamento_id:
            try:
                agendamento_obj = Agendamento.objects.get(id=agendamento_id, paciente=paciente)
                # Só pega se não for nulo
                if agendamento_obj.especialidade:
                    especialidade_herdada = agendamento_obj.especialidade
            except Agendamento.DoesNotExist:
                pass 
        
        # ★★★ 2. O FALLBACK (A CORREÇÃO) ★★★
        # Se, depois de tentar o agendamento, a especialidade AINDA for NULA...
        if not especialidade_herdada:
            # ...tente pegar o NOME da especialidade que o frontend enviou
            especialidade_nome_fornecida = self.request.data.get('especialidade_nome_fornecida')
            
            if especialidade_nome_fornecida:
                try:
                    # Busca o objeto Especialidade pelo nome
                    especialidade_herdada = Especialidade.objects.get(nome__iexact=especialidade_nome_fornecida)
                except Especialidade.DoesNotExist:
                    pass # Continua nulo se o nome for inválido

        
        # 3. Salva a evolução com os dados
        serializer.save(
            medico=self.request.user, 
            paciente=paciente,
            agendamento=agendamento_obj,       
            especialidade=especialidade_herdada # <-- Agora preenchido via fallback
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
    permission_classes = [CanViewProntuario]
    # (código interno da view restaurado)
    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return Atestado.objects.filter(paciente__id=paciente_id).order_by('-data_emissao')
    def perform_create(self, serializer):
        paciente = Paciente.objects.get(id=self.kwargs.get('paciente_id'))
        serializer.save(medico=self.request.user, paciente=paciente)

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
    
    clinica_info = Clinica.get_instance()
    logo_path = finders.find(clinica_info.logo) if clinica_info else None
    
    # 1. Busca Anamnese
    anamnese_obj = None
    paciente = None
    if 'evolucao' in context: paciente = context['evolucao'].paciente
    elif 'atestado' in context: paciente = context['atestado'].paciente
    elif 'prescricao' in context: paciente = context['prescricao'].paciente
    elif 'relatorio' in context: paciente = context['relatorio'].paciente

    if paciente:
        try:
            anamnese_obj = Anamnese.objects.get(paciente=paciente)
        except Anamnese.DoesNotExist:
            anamnese_obj = None

    # 2. IDENTIFICAÇÃO DO MÉDICO (DEBUG)
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

    if medico_assinante:
        print(f"DEBUG: Médico identificado no contexto: {medico_assinante.get_full_name()} (ID: {medico_assinante.id})")
    else:
        print("DEBUG: ERRO - Nenhum médico foi identificado no contexto do PDF.")

    # 3. VERIFICAÇÃO DO CERTIFICADO
    tem_certificado_valido = False
    if medico_assinante and hasattr(medico_assinante, 'certificado'):
        print("DEBUG: O médico possui objeto 'CertificadoMedico' vinculado.")
        if medico_assinante.certificado.arquivo_p12:
            try:
                # Tenta verificar se o arquivo existe fisicamente
                caminho = medico_assinante.certificado.arquivo_p12.path
                print(f"DEBUG: Arquivo .p12 encontrado em: {caminho}")
                tem_certificado_valido = True
            except Exception as e:
                print(f"DEBUG: Erro ao acessar arquivo do certificado: {e}")
        else:
            print("DEBUG: O objeto CertificadoMedico existe, mas o campo arquivo_p12 está vazio.")
    else:
        print("DEBUG: O médico NÃO possui certificado configurado no banco de dados.")

    # ==========================================================
    # === BLOCO QUE FALTAVA: DEFINIÇÃO DO full_context ===
    # ==========================================================
    if 'medico' not in context and medico_assinante:
        context['medico'] = medico_assinante

    full_context = {
        'clinica': clinica_info,
        'anamnese': anamnese_obj,
        'tem_assinatura_digital': tem_certificado_valido, 
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
        
        # --- VIU COMO FICOU LIMPO? ---
        context = {'prescricao': prescricao}
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
        if paciente_id:
            return Laudo.objects.filter(paciente__id=paciente_id).order_by('-data_criacao')
        return Laudo.objects.all().order_by('-data_criacao')

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
        if sexo_laudo and not paciente.genero: # Se sua API usar 'sexo', mude aqui
            novo_sexo = 'M' if sexo_laudo.lower() == 'masculino' else 'F'
            paciente.genero = novo_sexo # Ou paciente.sexo = novo_sexo
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
            tipo_exame=self.request.data.get('titulo', 'EXAME'),
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
            
        # 4. Salva as imagens individualmente
        if imagens_lista:
            for index, img_str in enumerate(imagens_lista):
                try:
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
                    print(f"DEBUG: Imagem {index} salva no disco com sucesso.")
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

            laudos_anteriores = Laudo.objects.filter(
                paciente=paciente, 
                titulo_exame=titulo_base
            ).exclude(id=laudo.id)
            
            exame_herdado = None # <--- ESSA É A VARIÁVEL QUE FALTAVA

            if laudos_anteriores.exists():
                for laudo_antigo in laudos_anteriores:
                    # 1. O novo laudo "rouba" o contêiner (Exame) do laudo antigo
                    if laudo_antigo.exame:
                        exame_herdado = laudo_antigo.exame
                        laudo_antigo.exame = None # Desvincula para sumir do portal
                    
                    # 2. Inativa o laudo antigo no prontuário
                    laudo_antigo.status = 'CANCELADO_POR_RETIFICACAO'
                    laudo_antigo.save()
                    
                    # 3. Limpa o PDF velho de dentro do contêiner
                    if exame_herdado and laudo_antigo.arquivo_pdf:
                        nome_arquivo_antigo = laudo_antigo.arquivo_pdf.name.split('/')[-1]
                        ArquivoExame.objects.filter(
                            exame=exame_herdado,
                            tipo='LAUDO',
                            arquivo__icontains=nome_arquivo_antigo
                        ).delete()
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
                    exame = Exame.objects.filter(id=exame_id_front).exclude(id__in=exames_usados_ids).first()
                
                if not exame:
                    # Limite de dias baseado na data do exame (retroativo)
                    limite_dias = data_retroativa - timedelta(days=15)
                    exame = Exame.objects.filter(
                        paciente=paciente, data_exame__gte=limite_dias
                    ).exclude(id__in=exames_usados_ids).order_by('-data_exame', '-criado_em').first()
                
                if not exame:
                    nome_unico_pasta = f"{paciente.nome_completo} - L{laudo.id}"
                    exame = Exame.objects.create(
                        paciente=paciente, 
                        data_exame=data_retroativa, # <--- DATA CORRETA NO BANCO E NO PORTAL
                        nome_paciente_pasta=nome_unico_pasta, status='DISPONIVEL'
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
                'codigo': exame.codigo_acesso,
                'senha': exame.senha_acesso,
                'link': 'https://clinica-limale.vercel.app/resultados',
                'exame_id': exame.id
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
        if instance.medico != self.request.user:
            raise PermissionDenied("Você não tem permissão para excluir o laudo de outro médico.")
        
        if instance.status == 'FINALIZADO':
            raise ValidationError("Falha Médico-Legal: Laudos finalizados são registros permanentes e não podem ser excluídos.")

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
        print("[DEBUG] Falha: Paciente tem laudos, mas nenhum possui 'codigo_acesso' preenchido.")
        return Response({'erro': 'Nenhum laudo encontrado com código de acesso'}, status=404)

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
            
        imagens_do_json = dados_dict.pop('imagens', [])

        # =========================================================================
        # NOVIDADE: ATUALIZAÇÃO AUTOMÁTICA DO CADASTRO DO PACIENTE
        # =========================================================================
        paciente_atualizado = False

        sexo_laudo = dados_dict.get('sexo')
        if sexo_laudo and not paciente.genero:
            novo_sexo = 'M' if sexo_laudo.lower() == 'masculino' else 'F'
            paciente.genero = novo_sexo 
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
            print(f"DEBUG: Dados do paciente {paciente.nome_completo} atualizados via Laudo Async.")
        # =========================================================================
        
        # 2. Salva o Laudo Básico como PROCESSANDO
        laudo = serializer.save(
            medico=self.request.user, 
            paciente=paciente,
            tipo_exame=self.request.data.get('titulo', 'EXAME'),
            dados_estruturados=dados_dict,
            status='PROCESSANDO'
        )

        # 3. Tratar imagens anexadas (Otimizadas pelo React)
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
            
        # 4. Salva as imagens individualmente (CORRIGIDO: Revertido bulk_create por segurança de nuvem)
        if imagens_lista:
            for index, img_str in enumerate(imagens_lista):
                try:
                    if ";base64," in img_str:
                        format, imgstr = img_str.split(';base64,') 
                        ext = format.split('/')[-1]
                    else:
                        imgstr = img_str
                        ext = 'jpg'
                    data = base64.b64decode(imgstr)
                    file_name = f"laudo_{laudo.id}_img_{index}.{ext}"
                    
                    # O bulk_create NÃO sobe o arquivo para a nuvem (Supabase/S3).
                    # Como as imagens agora são super leves (otimizadas a 500px no React), 
                    # salvar com .create() é muito rápido e garante que a foto apareça no portal.
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

            laudos_anteriores = Laudo.objects.filter(
                paciente=paciente, 
                titulo_exame=titulo_base
            ).exclude(id=laudo.id)
            
            exame_herdado = None # <--- ESSA É A VARIÁVEL QUE FALTAVA

            if laudos_anteriores.exists():
                for laudo_antigo in laudos_anteriores:
                    # 1. O novo laudo "rouba" o contêiner (Exame) do laudo antigo
                    if laudo_antigo.exame:
                        exame_herdado = laudo_antigo.exame
                        laudo_antigo.exame = None # Desvincula para sumir do portal
                    
                    # 2. Inativa o laudo antigo no prontuário
                    laudo_antigo.status = 'CANCELADO_POR_RETIFICACAO'
                    laudo_antigo.save()
                    
                    # 3. Limpa o PDF velho de dentro do contêiner
                    if exame_herdado and laudo_antigo.arquivo_pdf:
                        nome_arquivo_antigo = laudo_antigo.arquivo_pdf.name.split('/')[-1]
                        ArquivoExame.objects.filter(
                            exame=exame_herdado,
                            tipo='LAUDO',
                            arquivo__icontains=nome_arquivo_antigo
                        ).delete()
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
                    exame = Exame.objects.filter(id=exame_id_front).exclude(id__in=exames_usados_ids).first()
                
                if not exame:
                    # Limite de dias baseado na data do exame (retroativo)
                    limite_dias = data_retroativa - timedelta(days=15)
                    exame = Exame.objects.filter(
                        paciente=paciente, data_exame__gte=limite_dias
                    ).exclude(id__in=exames_usados_ids).order_by('-data_exame', '-criado_em').first()
                
                if not exame:
                    nome_unico_pasta = f"{paciente.nome_completo} - L{laudo.id}"
                    exame = Exame.objects.create(
                        paciente=paciente, 
                        data_exame=data_retroativa, # <--- DATA CORRETA NO BANCO E NO PORTAL
                        nome_paciente_pasta=nome_unico_pasta, status='DISPONIVEL'
                    )

            # Salva o vínculo final
            laudo.exame = exame
            laudo.save()
            
            # --- 🛡️ CAMADA 3: SALVAR PDF TRANSPARENTE E DISPARAR CELERY ---
            if 'arquivo_pdf' in request.FILES:
                pdf_file = request.FILES['arquivo_pdf']
                
                # Usa a data retroativa no nome físico do arquivo
                data_hoje_str = data_retroativa.strftime("%d-%m-%Y")
                nome_base_arquivo = f"{laudo.titulo_exame}_{paciente.nome_completo}_{data_hoje_str}"
                nome_seguro = slugify(nome_base_arquivo).upper()
                extensao = pdf_file.name.split('.')[-1]
                pdf_file.name = f"{nome_seguro}.{extensao}"
                
                # Salva o PDF no banco. Ele ainda não tem máscara nem assinatura.
                laudo.arquivo_pdf = pdf_file
            
            laudo.save()
            
            # --- A MÁGICA: DELEGA O PESO PARA O WORKER ---
            from .tasks import processar_laudo_background
            processar_laudo_background.delay(laudo.id)
            print(f"[API] Laudo {laudo.id} enviado para a fila do Celery.")

            # --- PREPARANDO RESPOSTA PRO FRONTEND ---
            # Devolvemos as credenciais NA HORA para o React não quebrar o WhatsApp
            response.data['titulo_exame'] = laudo.titulo_exame
            response.data['credenciais'] = {
                'codigo': exame.codigo_acesso,
                'senha': exame.senha_acesso,
                'link': 'https://clinica-limale.vercel.app/resultados',
                'exame_id': exame.id
            }
            
            response.status_code = status.HTTP_202_ACCEPTED

        except Exception as e:
            print(f"DEBUG [LAUDO ASYNC]: Erro crítico geral: {e}")

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
        }
        
        # Se finalizou, incluímos as credenciais para o portal
        if laudo.status == 'FINALIZADO' and laudo.exame:
            data["credenciais"] = {
                "codigo": laudo.exame.codigo_acesso,
                "senha": laudo.exame.senha_acesso,
                "link": "https://clinica-limale.vercel.app/resultados"
            }
            
        return Response(data)