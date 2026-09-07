import pytest
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from push_notifications.models import WebPushSubscription
from push_notifications.services import enviar_notificacao_push
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from chat.models import Message, ChatRoom

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
    """Cria uma mensagem P2P entre a recepção e o médico"""
    return Message.objects.create(
        sender=usuario_recepcao,
        receiver=usuario_medico,
        content="Olá Doutor, o paciente chegou.",
        attachment_type="text"
    )

@pytest.fixture
def sala_teste(db, usuario_medico):
    """Cria uma sala de consultório restrita"""
    sala = ChatRoom.objects.create(name="Consultório 01 (Cardiologia)")
    sala.membros.add(usuario_medico)
    return sala

@pytest.fixture
def conversa_grupo(db, usuario_recepcao, sala_teste):
    """Cria uma mensagem dentro do grupo/sala"""
    return Message.objects.create(
        sender=usuario_recepcao,
        room=sala_teste,
        content="Aviso a todos: Sistema em manutenção.",
        attachment_type="text"
    )

# ==========================================
# 1. TESTES DE INTEGRIDADE DO BANCO E MODELOS
# ==========================================

@pytest.mark.django_db
class TestChatModelsIntegridade:

    def test_regras_de_acesso_a_sala(self, sala_teste, usuario_recepcao, usuario_medico, usuario_intruso):
        """Testa se as permissões de entrar no grupo funcionam corretamente na raiz do banco"""
        assert sala_teste.user_has_access(usuario_recepcao) is True # Acesso Global (Recepção)
        assert sala_teste.user_has_access(usuario_medico) is True   # Membro Explícito
        assert sala_teste.user_has_access(usuario_intruso) is False # Intruso Barrado

    def test_bloqueio_mensagem_ambigua(self, usuario_recepcao, usuario_medico, sala_teste):
        """O banco DEVE impedir mensagem que vá pro grupo e pro P2P simultaneamente"""
        msg = Message(sender=usuario_recepcao, receiver=usuario_medico, room=sala_teste, content="Bug")
        with pytest.raises(ValidationError) as erro:
            msg.clean()
        assert "não pode ser enviada para um usuário e um grupo" in str(erro.value)

    def test_bloqueio_mensagem_fantasma(self, usuario_recepcao):
        """O banco DEVE impedir mensagem sem destinatário NENHUM"""
        msg = Message(sender=usuario_recepcao, content="Falha na Matrix")
        with pytest.raises(ValidationError) as erro:
            msg.clean()
        assert "deve ter um destinatário" in str(erro.value)


# ==========================================
# 2. TESTES DE API (ISOLAMENTO E HISTÓRICO)
# ==========================================

@pytest.mark.django_db
class TestChatHistoryAPI:

    # --- TESTES ANTIGOS MANTIDOS (P2P) ---
    def test_historico_retorna_mensagens_corretas_entre_duas_pessoas(self, client, usuario_medico, usuario_recepcao, conversa_previa):
        """Garante que o médico consegue ver a mensagem que a recepção mandou para ele."""
        client.force_authenticate(user=usuario_medico)
        url = reverse('chat-history') 
        
        response = client.get(f"{url}?contact_id={usuario_recepcao.id}")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['content'] == "Olá Doutor, o paciente chegou."

    def test_historico_nao_vaza_para_terceiros(self, client, usuario_intruso, usuario_recepcao, conversa_previa):
        """Um médico não pode ler a conversa da recepção com outro médico."""
        client.force_authenticate(user=usuario_intruso)
        url = reverse('chat-history')
        
        response = client.get(f"{url}?contact_id={usuario_recepcao.id}")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0, "Falha de Privacidade: O histórico vazou para outro usuário!"

    # --- NOVOS TESTES (GRUPOS E SALAS) ---
    def test_historico_grupo_retorna_mensagens(self, client, usuario_medico, sala_teste, conversa_grupo):
        """Garante que um membro da sala consegue baixar o histórico do grupo."""
        client.force_authenticate(user=usuario_medico)
        url = reverse('chat-history')
        
        response = client.get(f"{url}?room_id={sala_teste.id}")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['content'] == "Aviso a todos: Sistema em manutenção."

    def test_historico_grupo_bloqueado_para_intrusos(self, client, usuario_intruso, sala_teste, conversa_grupo):
        """Garante que a API retorna 403 Forbidden se um médico tentar ler o grupo de outro."""
        client.force_authenticate(user=usuario_intruso)
        url = reverse('chat-history')
        
        response = client.get(f"{url}?room_id={sala_teste.id}")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Você não tem acesso a este consultório." in str(response.data) # ✅ Agora bate com a View!


# ==========================================
# 3. TESTES DA NOVA API DE LISTAGEM DE SALAS
# ==========================================

@pytest.mark.django_db
class TestChatRoomsAPI:

    def test_lista_salas_permitidas(self, client, usuario_medico, usuario_intruso, sala_teste):
        """O endpoint de salas só pode retornar os grupos que o usuário tem acesso"""
        url = reverse('chat-rooms') # O name que colocamos no urls.py
        
        # 1. Médico Autorizado deve ver a sala
        client.force_authenticate(user=usuario_medico)
        res_autorizado = client.get(url)
        assert res_autorizado.status_code == status.HTTP_200_OK
        assert len(res_autorizado.data) == 1
        assert res_autorizado.data[0]['id'] == sala_teste.id
        
        # 2. Médico Intruso NÃO deve ver a sala
        client.force_authenticate(user=usuario_intruso)
        res_intruso = client.get(url)
        assert res_intruso.status_code == status.HTTP_200_OK
        assert len(res_intruso.data) == 0

@pytest.mark.django_db
class TestPushNotifications:

    def test_api_inscricao_push_salva_no_banco(self, client, usuario_medico):
        """Garante que o React consegue salvar a inscrição do celular no banco de dados"""
        client.force_authenticate(user=usuario_medico)
        url = reverse('push-subscribe') # O name da sua rota no urls.py do app push
        
        payload = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/meu-celular-fake",
            "keys": {
                "p256dh": "chave-publica-falsa",
                "auth": "chave-auth-falsa"
            }
        }
        
        response = client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert WebPushSubscription.objects.filter(user=usuario_medico).count() == 1
        
        # Se mandar de novo, não deve duplicar (testando o update_or_create)
        client.post(url, payload, format='json')
        assert WebPushSubscription.objects.filter(user=usuario_medico).count() == 1

    @patch('push_notifications.services.webpush')
    def test_disparo_notificacao_chama_biblioteca_correta(self, mock_webpush, usuario_medico):
        """
        Simula o envio de um Push sem bater nos servidores do Google.
        Usamos @patch para interceptar a biblioteca pywebpush.
        """
        # 1. Criamos a inscrição falsa no banco
        WebPushSubscription.objects.create(
            user=usuario_medico,
            endpoint="https://fake-endpoint.com",
            auth="auth123",
            p256dh="key123"
        )
        
        # 2. Chamamos a nossa função de disparo
        sucesso = enviar_notificacao_push(
            user_id=usuario_medico.id,
            titulo="Nova Mensagem",
            corpo="Teste de Push"
        )
        
        # 3. Verificamos se deu tudo certo e se a biblioteca interceptada foi chamada
        assert sucesso is True
        mock_webpush.assert_called_once()
        
        # 4. Verificamos se enviamos os dados corretos para o Google/Apple
        args, kwargs = mock_webpush.call_args
        assert kwargs['subscription_info']['endpoint'] == "https://fake-endpoint.com"
        assert '"title": "Nova Mensagem"' in kwargs['data']