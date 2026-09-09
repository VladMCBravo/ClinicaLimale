import pytest
from unittest.mock import patch, MagicMock
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model
from push_notifications.models import WebPushSubscription
from push_notifications.services import enviar_notificacao_push
from pywebpush import WebPushException

User = get_user_model()

# ==========================================
# FIXTURES DO MÓDULO DE PUSH
# ==========================================

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def usuario_medico(db):
    return User.objects.create_user(username='dr_silva', password='123', cargo='medico')

@pytest.fixture
def push_payload():
    return {
        "endpoint": "https://fcm.googleapis.com/fcm/send/celular-fake",
        "keys": {
            "p256dh": "chave-publica-teste",
            "auth": "chave-auth-teste"
        }
    }


# ==========================================
# 1. TESTES DO MODELO
# ==========================================

@pytest.mark.django_db
class TestWebPushSubscriptionModel:

    def test_criacao_e_str_representation(self, usuario_medico):
        "Garante que a string representation do modelo funciona corretamente"
        usuario_medico.first_name = "Carlos"
        usuario_medico.save()
        
        sub = WebPushSubscription.objects.create(
            user=usuario_medico,
            endpoint="https://fcm.googleapis.com/fcm/send/123",
            auth="auth123",
            p256dh="p256dh123"
        )
        assert str(sub) == "Push Sub de Carlos"


# ==========================================
# 2. TESTES DA API (VIEWS)
# ==========================================

@pytest.mark.django_db
class TestSubscribePushAPIView:

    def test_api_inscricao_push_salva_no_banco(self, client, usuario_medico, push_payload):
        "O payload do frontend deve ser salvo corretamente no banco"
        client.force_authenticate(user=usuario_medico)
        url = reverse('push-subscribe')
        
        response = client.post(url, push_payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert WebPushSubscription.objects.filter(user=usuario_medico).count() == 1

    def test_api_inscricao_atualiza_ao_inves_de_duplicar(self, client, usuario_medico, push_payload):
        "Se o frontend mandar a mesma inscrição, não deve criar registros duplicados"
        client.force_authenticate(user=usuario_medico)
        url = reverse('push-subscribe')
        
        client.post(url, push_payload, format='json')
        client.post(url, push_payload, format='json') # Tentativa de duplicidade
        
        assert WebPushSubscription.objects.filter(user=usuario_medico).count() == 1

    def test_api_rejeita_dados_incompletos(self, client, usuario_medico):
        "Garante que a API retorna 400 Bad Request se faltar auth ou p256dh"
        client.force_authenticate(user=usuario_medico)
        url = reverse('push-subscribe')
        
        payload_invalido = {"endpoint": "https://fcm.googleapis.com/fcm/send/fake"}
        response = client.post(url, payload_invalido, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_api_exige_autenticacao(self, client, push_payload):
        "Garante que endpoints expostos precisam de token de autorização"
        url = reverse('push-subscribe')
        response = client.post(url, push_payload, format='json')
        
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


# ==========================================
# 3. TESTES DE SERVIÇO (DISPARO E LIMPEZA)
# ==========================================

@pytest.mark.django_db
class TestPushNotificationService:

    @patch('push_notifications.services.webpush')
    def test_disparo_notificacao_com_sucesso(self, mock_webpush, usuario_medico):
        "Mocka o servidor do Google e garante que o payload é disparado corretamente"
        WebPushSubscription.objects.create(
            user=usuario_medico,
            endpoint="https://fake-endpoint.com",
            auth="auth123",
            p256dh="key123"
        )
        
        sucesso = enviar_notificacao_push(
            user_id=usuario_medico.id,
            titulo="Nova Mensagem no Chat",
            corpo="Os exames laboratoriais do paciente chegaram."
        )
        
        assert sucesso is True
        mock_webpush.assert_called_once()
        
        args, kwargs = mock_webpush.call_args
        assert kwargs['subscription_info']['endpoint'] == "https://fake-endpoint.com"
        assert '"title": "Nova Mensagem no Chat"' in kwargs['data']

    def test_disparo_abortado_se_usuario_nao_tem_inscricao(self, usuario_medico):
        "Se o usuário não habilitou o Push, não tenta disparar nada"
        sucesso = enviar_notificacao_push(usuario_medico.id, "Teste", "Teste")
        assert sucesso is False

    @patch('push_notifications.services.webpush')
    def test_remove_inscricao_expirada_do_banco(self, mock_webpush, usuario_medico):
        "Se a inscrição foi revogada no navegador e a API retornar 410 (Gone), nosso backend tem que excluir a inscrição do banco."
        sub = WebPushSubscription.objects.create(
            user=usuario_medico, endpoint="https://fake.com", auth="a", p256dh="p"
        )
        
        mock_response = MagicMock()
        mock_response.status_code = 410 # Código de 'Inscrição Expirada' no Google/Apple
        mock_webpush.side_effect = WebPushException("Gone", mock_response)

        enviar_notificacao_push(usuario_medico.id, "Alerta", "Mensagem")

        # A inscrição precisa ter sido automaticamente apagada no catch do service
        assert WebPushSubscription.objects.filter(id=sub.id).count() == 0

