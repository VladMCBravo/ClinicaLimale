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