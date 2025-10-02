# core/asgi.py - VERSÃO CORRIGIDA

import os
from django.core.asgi import get_asgi_application

# 1. Inicializa o Django PRIMEIRO.
# Esta linha efetivamente chama django.setup() e carrega os apps.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django_asgi_app = get_asgi_application()

# 2. AGORA que o Django está pronto, podemos importar
#    componentes que dependem dele, como o routing.
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import chatbot.routing

# Esta é a configuração principal do Channels.
application = ProtocolTypeRouter({
    # Para requisições HTTP, usa a aplicação que já inicializamos.
    "http": django_asgi_app,

    # Para conexões WebSocket, agora é seguro carregar as rotas.
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chatbot.routing.websocket_urlpatterns
        )
    ),
})