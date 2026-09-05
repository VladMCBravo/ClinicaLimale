import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model
from chat.models import Message

User = get_user_model()

# ==========================================
# FIXTURES DO MÓDULO DE CHAT
# ==========================================

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def usuario_recepcao(db):
    return User.objects.create_user(username='recepcao_chat', password='123', cargo='recepcao')

@pytest.fixture
def usuario_medico(db):
    return User.objects.create_user(username='medico_chat', password='123', cargo='medico')

@pytest.fixture
def usuario_intruso(db):
    return User.objects.create_user(username='medico_intruso', password='123', cargo='medico')

@pytest.fixture
def conversa_previa(db, usuario_recepcao, usuario_medico):
    """Cria uma mensagem entre a recepção e o médico"""
    return Message.objects.create(
        sender=usuario_recepcao,
        receiver=usuario_medico,
        content="Olá Doutor, o paciente chegou.",
        attachment_type="text"
    )

# ==========================================
# TESTES DE ISOLAMENTO E HISTÓRICO
# ==========================================

@pytest.mark.django_db
class TestChatHistoryAPI:

    def test_historico_retorna_mensagens_corretas_entre_duas_pessoas(self, client, usuario_medico, usuario_recepcao, conversa_previa):
        """Garante que o médico consegue ver a mensagem que a recepção mandou para ele."""
        client.force_authenticate(user=usuario_medico)
        url = reverse('chat-history') # Certifique-se de que este é o 'name' no seu urls.py
        
        # O médico pede o histórico da conversa dele com a recepção
        response = client.get(f"{url}?contact_id={usuario_recepcao.id}")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['content'] == "Olá Doutor, o paciente chegou."
        assert response.data[0]['is_mine'] is False # A mensagem foi enviada pela recepção

    def test_historico_nao_vaza_para_terceiros(self, client, usuario_intruso, usuario_recepcao, conversa_previa):
        """Um médico não pode ler a conversa da recepção com outro médico."""
        client.force_authenticate(user=usuario_intruso)
        url = reverse('chat-history')
        
        # O intruso tenta pedir o histórico de conversas dele com a recepção
        response = client.get(f"{url}?contact_id={usuario_recepcao.id}")

        assert response.status_code == status.HTTP_200_OK
        # Como o intruso não tem mensagens com a recepção, a lista deve vir vazia
        assert len(response.data) == 0, "Falha de Privacidade: O histórico vazou para outro usuário!"