# core/asgi.py

import os
from django.core.asgi import get_asgi_application

# 1. Inicializa o Django PRIMEIRO.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django_asgi_app = get_asgi_application()

# 2. AGORA que o Django está pronto, podemos importar as rotas
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

import chatbot.routing
import chat.routing  # <- NOVO: Importamos as rotas do chat interno

# 3. Somamos as listas de rotas dos dois apps
combined_websocket_urlpatterns = (
    chatbot.routing.websocket_urlpatterns + 
    chat.routing.websocket_urlpatterns
)

# 4. Configuração principal do Channels
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            combined_websocket_urlpatterns  # <- Usamos as rotas combinadas aqui
        )
    ),
})