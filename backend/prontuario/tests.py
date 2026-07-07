import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model
from pacientes.models import Paciente
from prontuario.models import Laudo, Evolucao

User = get_user_model()

# ==========================================
# FIXTURES DO MÓDULO DE PRONTUÁRIOS
# ==========================================

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def medico_titular(db):
    return User.objects.create_user(username='dr_titular', password='123', cargo='medico')

@pytest.fixture
def medico_intruso(db):
    return User.objects.create_user(username='dr_intruso', password='123', cargo='medico')

@pytest.fixture
def paciente_padrao(db):
    return Paciente.objects.create(
        nome_completo="Maria da Silva",
        cpf="12345678901",
        data_nascimento="1990-01-01"
    )

@pytest.fixture
def laudo_rascunho(db, medico_titular, paciente_padrao):
    return Laudo.objects.create(
        paciente=paciente_padrao,
        medico=medico_titular,
        titulo_exame="USG Obstétrico",
        status="RASCUNHO",
        texto_laudo="Feto único, vivo..."
    )

@pytest.fixture
def laudo_finalizado(db, medico_titular, paciente_padrao):
    return Laudo.objects.create(
        paciente=paciente_padrao,
        medico=medico_titular,
        titulo_exame="USG Morfológico",
        status="FINALIZADO",
        texto_laudo="Exame normal concluído."
    )

@pytest.fixture
def evolucao_clinica(db, medico_titular, paciente_padrao):
    return Evolucao.objects.create(
        paciente=paciente_padrao,
        medico=medico_titular,
        notas_subjetivas="Paciente apresenta quadro estável."
    )

# 👇 ADICIONE ESTE BLOCO AQUI 👇
@pytest.fixture(autouse=True)
def disable_external_storage(settings):
    """Força o Django a usar o armazenamento local durante os testes."""
    settings.DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'


# ==========================================
# TESTES DE IMUTABILIDADE E ISOLAMENTO DE LAUDOS
# ==========================================

@pytest.mark.django_db

class TestLaudoSecurity:

    def test_medico_nao_pode_editar_laudo_de_outro_medico(self, client, medico_intruso, laudo_rascunho):
        """Garante que um médico não altera o rascunho de outro profissional."""
        client.force_authenticate(user=medico_intruso)
        url = reverse('detalhe-laudo', kwargs={'pk': laudo_rascunho.id})
        
        payload = {"texto_laudo": "Alteração indevida por terceiros."}
        response = client.patch(url, payload)

        # Dependendo da implementação de permissão do DRF, o padrão seguro é 403 ou 404
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND], \
            "Falha de Segurança: O sistema não bloqueou a edição cruzada de laudos!"

    def test_nao_permitir_edicao_de_laudo_finalizado(self, client, medico_titular, laudo_finalizado):
        """Um laudo finalizado/assinado é um documento médico-legal imutável."""
        client.force_authenticate(user=medico_titular)
        url = reverse('detalhe-laudo', kwargs={'pk': laudo_finalizado.id})
        
        payload = {"texto_laudo": "Tentativa de alteração pós-assinatura."}
        response = client.patch(url, payload)

        # A modificação deve ser explicitamente rejeitada por validação (400) ou permissão (403)
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN], \
            "Falha Médico-Legal: O sistema permitiu alterar um laudo FINALIZADO!"


# ==========================================
# TESTES DE PROTEÇÃO DE EVOLUÇÕES CLÍNICAS
# ==========================================

@pytest.mark.django_db
class TestEvolucaoSecurity:

    def test_medico_nao_pode_editar_evolucao_alheia(self, client, medico_intruso, evolucao_clinica):
        """Impede alteração no histórico clínico de outro profissional."""
        client.force_authenticate(user=medico_intruso)
        url = reverse('detalhe-evolucao', kwargs={'pk': evolucao_clinica.id})
        
        payload = {"notas_subjetivas": "Adulterando anotação médica."}
        response = client.patch(url, payload)

        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    def test_medico_nao_pode_deletar_evolucao_alheia(self, client, medico_intruso, evolucao_clinica):
        """Bloqueia exclusão de registros do prontuário por terceiros."""
        client.force_authenticate(user=medico_intruso)
        url = reverse('detalhe-evolucao', kwargs={'pk': evolucao_clinica.id})
        
        response = client.delete(url)

        # Garante que a deleção não foi concluída com sucesso (HTTP 204 No Content)
        assert response.status_code != status.HTTP_204_NO_CONTENT
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

from rest_framework.test import APIRequestFactory, force_authenticate
from unittest.mock import patch
from prontuario.views import EvolucaoListCreateAPIView, GerarEvolucaoPDFView
from django.http import HttpResponse

# Cria uma fábrica de requisições solta (não precisa saber as rotas do urls.py)
factory = APIRequestFactory()

# ==========================================
# TESTES DE INTEGRAÇÃO DA API (VIEWS)
# ==========================================

@pytest.mark.django_db
class TestEvolucaoAPIViews:

    def test_criar_evolucao_via_api(self, medico_titular, paciente_padrao):
        """Garante que a View de criação de evolução processa os dados corretamente e retorna 201."""
        view = EvolucaoListCreateAPIView.as_view()
        
        # Simulando o JSON que o React envia
        request = factory.post('/fake-url/', {
            'notas_subjetivas': 'Paciente relata dor de cabeça moderada.',
            'notas_objetivas': 'Sinais vitais normais.',
            'agendamento': '' # Testando a lógica de criação sem agendamento prévio
        })
        # Autenticando a requisição com o nosso médico de teste
        force_authenticate(request, user=medico_titular)

        # Disparando a View
        response = view(request, paciente_id=paciente_padrao.id)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['notas_subjetivas'] == 'Paciente relata dor de cabeça moderada.'


# ==========================================
# TESTES AVANÇADOS COM DUBLES (MOCKING DE I/O)
# ==========================================

@pytest.mark.django_db
class TestGeracaoPDFViews:

    @patch('prontuario.views.pisa.pisaDocument') # Intercepta o gerador HTML -> PDF
    @patch('prontuario.views.PdfReader')         # Intercepta a leitura da máscara (Receituario.pdf)
    @patch('prontuario.views.PdfWriter')         # Intercepta a montagem final do PDF
    @patch('prontuario.views.assinar_pdf_digitalmente') # Intercepta a criptografia do certificado
    def test_gerar_pdf_evolucao_seguro(
        self, mock_assinar, mock_writer, mock_reader, mock_pisa, 
        medico_titular, evolucao_clinica
    ):
        """
        Garante que o endpoint de PDF não quebra, passando por toda a esteira 
        (HTML -> Máscara -> Assinatura) usando dublês para os arquivos físicos.
        """
        # 1. Configurando os dublês para não travarem o sistema
        mock_pisa.return_value.err = False
        mock_assinar.return_value = b"BYTES_DO_PDF_FALSO_ASSINADO"
        
        # 👇 A CORREÇÃO ENTRA AQUI: Criamos um certificado falso na hora 👇
        from usuarios.models import CertificadoMedico
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        CertificadoMedico.objects.create(
            medico=medico_titular,
            arquivo_p12=SimpleUploadedFile("cert_falso.p12", b"dados_criptograficos_falsos")
        )
        # 👆 FIM DA CORREÇÃO 👆
        
        view = GerarEvolucaoPDFView.as_view()
        request = factory.get('/fake-url/')
        force_authenticate(request, user=medico_titular)

        # 2. Executando a requisição GET do PDF
        response = view(request, evolucao_id=evolucao_clinica.id)

        # 3. Verificações de Sucesso
        assert response.status_code == 200
        assert response['Content-Type'] == 'application/pdf'
        
        # Garante que o nome do arquivo foi gerado com o nome do paciente
        assert evolucao_clinica.paciente.nome_completo in response['Content-Disposition']
        
        # AGORA SIM! Garante que a assinatura foi chamada com sucesso
        assert mock_pisa.called is True
        assert mock_reader.called is True
        assert mock_writer.called is True
        assert mock_assinar.called is True

from prontuario.utils import formatar_texto_laudo_para_html

class TestFormatadorDeLaudos:
    def test_formatador_detecta_tabela_obstetrica(self):
        """Garante que a palavra 'BIOMETRIA FETAL' formata as medidas em divs estruturadas (nova arquitetura anti-bug)."""
        texto_bruto = "BIOMETRIA FETAL\nDiâmetro Biparietal: 50 mm"
        html_gerado = formatar_texto_laudo_para_html(texto_bruto)
        
        # A tag <table foi removida para evitar o erro 500 do xhtml2pdf.
        # Agora verificamos a nova formatação segura em <div> e <span>.
        assert '<div style="margin-bottom: 3px;' in html_gerado
        assert '<span style="color: #333; font-weight: bold;">Diâmetro Biparietal:</span>' in html_gerado
        assert 'BIOMETRIA FETAL' in html_gerado
        assert '50 mm' in html_gerado

    def test_formatador_detecta_tabela_cardiologica(self):
        """Garante que a 'TABELA DE MEDIDAS' do Ecocardiograma gera as divs formatadas."""
        texto_bruto = "TABELA DE MEDIDAS\nRaiz aórtica: 30 mm"
        html_gerado = formatar_texto_laudo_para_html(texto_bruto)
        
        assert '<div style="margin-bottom: 3px;' in html_gerado
        assert '<span style="color: #333; font-weight: bold;">Raiz aórtica:</span>' in html_gerado
        assert 'TABELA DE MEDIDAS' in html_gerado
        assert '30 mm' in html_gerado

import json
from datetime import date
from crm.models import Ciclo
from unittest.mock import patch

@pytest.mark.django_db
class TestLaudoAsyncView:
    
    # Bloqueia o gatilho de transação do Django que disparava a Thread demorada
    @patch('django.db.transaction.on_commit') 
    @patch('prontuario.utils.gerar_pdf_laudo_backend')
    def test_criacao_laudo_gera_pdf_no_backend_quando_ausente(self, mock_gerar_pdf, mock_on_commit, client, medico_titular, paciente_padrao):
        """Testa se o Django gera o PDF sozinho quando o front envia apenas o texto (A Nova Arquitetura)."""
        
        mock_gerar_pdf.return_value = b"PDF_FALSO_DE_TESTE"
        
        client.force_authenticate(user=medico_titular)
        url = reverse('laudo-create-async')
        
        payload = {
            'paciente': paciente_padrao.id,
            'titulo': 'USG Obstétrico',
            'texto_laudo': 'Feto bem desenvolvido.',
            'dados_estruturados': json.dumps({'sexo': 'Feminino'})
        }
        
        response = client.post(url, payload, format='multipart')
        
        assert response.status_code == status.HTTP_202_ACCEPTED
        
        laudo_criado = Laudo.objects.get(paciente=paciente_padrao)
        
        assert bool(laudo_criado.arquivo_pdf) is True, "O Fallback do backend falhou em gerar o PDF!"
        assert laudo_criado.status == 'PROCESSANDO'
    
@pytest.mark.django_db
class TestAtualizacaoAutomaticaPaciente:
    
    @patch('django.db.transaction.on_commit') # Bloqueia o gatilho aqui também
    @patch('prontuario.utils.gerar_pdf_laudo_backend')
    def test_laudo_atualiza_idade_e_sexo_do_paciente_vazio(self, mock_gerar_pdf, mock_on_commit, client, medico_titular):
        mock_gerar_pdf.return_value = b"PDF_FALSO_DE_TESTE"
        
        client.force_authenticate(user=medico_titular)
        url = reverse('laudo-create-async')
        
        paciente_incompleto = Paciente.objects.create(nome_completo="Joana Sem Dados")
        
        payload = {
            'paciente': paciente_incompleto.id,
            'titulo': 'USG',
            'dados_estruturados': json.dumps({'sexo': 'Feminino', 'idade': '30 anos'})
        }
        
        client.post(url, payload, format='multipart')
        paciente_incompleto.refresh_from_db()
        
        assert paciente_incompleto.genero == 'F'
        assert paciente_incompleto.data_nascimento is not None
        assert paciente_incompleto.data_nascimento.year == date.today().year - 30


@pytest.mark.django_db
class TestSincroniaCRM:
    def test_laudo_finalizado_atualiza_dum_no_crm(self, db, medico_titular, paciente_padrao):
        """Garante que a extração inteligente da DUM atualize o ciclo do CRM."""
        
        # Cria um ciclo ativo no CRM sem data_dum
        ciclo = Ciclo.objects.create(paciente=paciente_padrao, tipo='GESTACAO', status='ativo')
        
        # Cria um laudo FINALIZADO com a estrutura aninhada do feto1 simulando a DUM
        Laudo.objects.create(
            paciente=paciente_padrao,
            medico=medico_titular,
            titulo_exame="USG Obstétrico",
            status="FINALIZADO", # Tem que ser finalizado para disparar o signal
            dados_estruturados={
                'feto1': {'metodoDatacao': 'DUM', 'dum': '2026-01-01'}
            }
        )
        
        # O Signal deve ter atuado
        ciclo.refresh_from_db()
        assert ciclo.data_dum == date(2026, 1, 1), "A extração da DUM do JSON e a sincronia com o CRM falharam!"

# ==========================================
# TESTES DA NOVA ROTA DE RESGATE DE LAUDOS
# ==========================================

@pytest.mark.django_db
class TestResgateLaudoAPI:

    # 🚀 CORREÇÃO AQUI: O caminho exato de onde a função foi declarada (utils)
    @patch('prontuario.utils.gerar_pdf_laudo_backend')
    def test_regerar_pdf_resgata_laudo_preso(self, mock_gerar_pdf, client, medico_titular, laudo_rascunho):
        """
        Garante que a nova rota de resgate (APIView isolada) consegue 
        forçar a montagem do PDF e alterar o status para FINALIZADO.
        """
        # 1. Configura o dublê para fingir que a biblioteca xhtml2pdf funcionou
        mock_gerar_pdf.return_value = b"PDF_FALSO_DE_TESTE_RESGATE"
        
        # 2. Autentica o médico
        client.force_authenticate(user=medico_titular)
        
        # 3. Monta a URL da nova rota registrada em urls.py
        url = reverse('regerar-laudo-pdf', kwargs={'laudo_id': laudo_rascunho.id})
        
        # 4. Dispara o POST
        response = client.post(url)
        
        # 5. Verificações
        assert response.status_code == status.HTTP_200_OK, "A API não retornou 200 OK na rota de resgate!"
        assert 'arquivo_url' in response.data, "A resposta não devolveu a URL do novo PDF!"
        
        # 6. Atualiza o objeto do banco para ver as mudanças reais
        laudo_rascunho.refresh_from_db()
        
        assert bool(laudo_rascunho.arquivo_pdf) is True, "O arquivo PDF não foi anexado ao laudo!"
        assert laudo_rascunho.status == 'FINALIZADO', "O status do laudo não mudou para FINALIZADO!"