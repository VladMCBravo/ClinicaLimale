import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import chatbot.routing # <-- Vamos criar este arquivo no próximo passo

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Esta é a configuração principal do Channels.
application = ProtocolTypeRouter({
    # Para requisições HTTP, usa a configuração padrão do Django.
    "http": get_asgi_application(),

    # Para conexões WebSocket, usa nossas rotas definidas em chatbot.routing.
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chatbot.routing.websocket_urlpatterns
        )
    ),
})
