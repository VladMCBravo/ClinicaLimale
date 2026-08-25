# core/asgi.py

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter

import chatbot.routing
import chat.routing
from chat.middleware import TokenAuthMiddleware

combined_websocket_urlpatterns = (
    chatbot.routing.websocket_urlpatterns +
    chat.routing.websocket_urlpatterns
)

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": TokenAuthMiddleware(
        URLRouter(combined_websocket_urlpatterns)
    ),
})