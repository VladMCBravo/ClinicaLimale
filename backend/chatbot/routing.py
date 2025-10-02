from django.urls import re_path
from . import consumers # <-- Vamos criar este arquivo no próximo passo

# Define as URLs que serão tratadas pelos nossos consumers de WebSocket
websocket_urlpatterns = [
    # A URL terá o formato ws://seu-dominio/ws/chat/{session_id}/
    # Isso nos permite identificar unicamente cada conversa de chatbot.
    re_path(r'ws/chat/(?P<session_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
]