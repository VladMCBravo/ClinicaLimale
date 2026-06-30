import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model
from pacientes.models import Paciente

User = get_user_model()

# ==========================================
# FIXTURES GERAIS DO MÓDULO DE USUÁRIOS
# ==========================================

@pytest.fixture
def client():
    """Retorna um cliente de API limpo para cada teste."""
    return APIClient()

@pytest.fixture
def usuario_medico(db):
    """Cria e retorna um usuário com cargo médico."""
    return User.objects.create_user(
        username='doutor_joao',
        password='senha_segura123',
        first_name='João',
        cargo='medico'
    )

@pytest.fixture
def usuario_recepcao(db):
    """Cria e retorna um usuário com cargo recepção."""
    return User.objects.create_user(
        username='recepcao_maria',
        password='senha_segura123',
        first_name='Maria',
        cargo='recepcao'
    )

# 👇 ADICIONE ESTE BLOCO AQUI 👇
@pytest.fixture
def paciente_padrao(db):
    """Cria um paciente temporário para testar o vínculo LGPD."""
    return Paciente.objects.create(
        nome_completo="Carlos Silva",
        cpf="11122233344",
        data_nascimento="1980-05-05"
    )

# ==========================================
# TESTES DE ACESSO AO PERFIL (/me/)
# ==========================================

@pytest.mark.django_db
class TestUserMeEndpoint:

    def test_acesso_negado_sem_autenticacao(self, client):
        """Bloqueia acesso anônimo com HTTP 401 Unauthorized."""
        url = reverse('user-me')
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_acesso_permitido_com_autenticacao(self, client, usuario_medico):
        """Retorna os dados exatos do usuário autenticado com HTTP 200 OK."""
        client.force_authenticate(user=usuario_medico)
        url = reverse('user-me')
        
        response = client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'doutor_joao'
        assert response.data['first_name'] == 'João'
        assert response.data['cargo'] == 'medico'


# ==========================================
# TESTES DE GESTÃO DE USUÁRIOS E SEGURANÇA RBAC
# ==========================================

@pytest.mark.django_db
class TestCustomUserRBAC:

    def test_recepcao_nao_pode_criar_novo_usuario(self, client, usuario_recepcao):
        """Garante que a recepção é estritamente bloqueada ao tentar cadastrar novos usuários."""
        client.force_authenticate(user=usuario_recepcao)
        url = reverse('usuario-list')
        
        payload_invasor = {
            'username': 'medico_ilegal',
            'password': '123',
            'first_name': 'Invasor',
            'cargo': 'medico'
        }
        
        response = client.post(url, payload_invasor)
        
        # Exige estritamente o erro 403 Forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ==========================================
# TESTES DE CERTIFICADOS DIGITAIS (.P12)
# ==========================================

@pytest.mark.django_db
class TestCertificadoUploadSecurity:

    def test_recepcao_nao_pode_fazer_upload_de_certificado(self, client, usuario_recepcao):
        """Apenas médicos podem manipular certificados A1 ICP-Brasil."""
        client.force_authenticate(user=usuario_recepcao)
        url = reverse('user-certificado')
        
        response = client.post(url, {})
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data['detail'] == "Apenas médicos podem fazer upload de certificado digital."

from unittest.mock import Mock
from usuarios.permissions import IsMedicoResponsavelOrAdmin, AllowRead_WriteRecepcaoAdmin
from pacientes.models import Paciente

# ==========================================
# TESTES ISOLADOS DAS REGRAS DE PERMISSÃO (LGPD)
# ==========================================

@pytest.mark.django_db
class TestObjectLevelPermissions:

    def test_permissao_medico_responsavel_admin(self, db, usuario_medico, usuario_recepcao, paciente_padrao):
        """Garante que apenas o Admin ou o Médico Responsável acesse os dados restritos."""
        permissao = IsMedicoResponsavelOrAdmin()
        
        # 1. Cria um usuário Admin
        admin = User.objects.create_user(username='chefe', cargo='admin')
        request_admin = Mock(user=admin)
        
        # Admin sempre tem acesso (Isso cobre a linha 34 do permissions.py)
        assert permissao.has_object_permission(request_admin, None, paciente_padrao) is True
        
        # 2. Testa com o Médico Responsável
        paciente_padrao.medico_responsavel = usuario_medico
        paciente_padrao.save()
        request_medico = Mock(user=usuario_medico)
        
        # O médico é o dono do paciente, deve passar (Cobre as linhas 36 a 44)
        assert permissao.has_object_permission(request_medico, None, paciente_padrao) is True
        
        # 3. Testa com um Médico Intruso (Que não é o responsável)
        medico_intruso = User.objects.create_user(username='intruso', cargo='medico')
        request_intruso = Mock(user=medico_intruso)
        
        # Deve ser bloqueado (Cobre a linha 46)
        assert permissao.has_object_permission(request_intruso, None, paciente_padrao) is False

    def test_allow_read_write_recepcao_admin(self, db, usuario_recepcao, usuario_medico):
        """Valida a regra de que Recepção/Admin podem ler e escrever, mas outros não."""
        permissao = AllowRead_WriteRecepcaoAdmin()
        
        # Testa a recepção fazendo uma requisição insegura (POST/Escrita)
        request_recepcao = Mock(user=usuario_recepcao, method='POST')
        assert permissao.has_permission(request_recepcao, None) is True
        
        # Testa o médico fazendo uma requisição insegura (POST/Escrita)
        request_medico = Mock(user=usuario_medico, method='POST')
        # O médico NÃO está na lista ['admin', 'recepcao'] dessa permissão específica
        assert permissao.has_permission(request_medico, None) is False
        
        # Testa o médico fazendo uma requisição segura (GET/Leitura)
        request_medico_leitura = Mock(user=usuario_medico, method='GET')
        from rest_framework.permissions import SAFE_METHODS
        assert request_medico_leitura.method in SAFE_METHODS
        assert permissao.has_permission(request_medico_leitura, None) is True