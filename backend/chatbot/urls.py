# chatbot/urls.py
from django.urls import path
from .views import ChatMemoryView

urlpatterns = [
    # Rota para o POST (salvar memória)
    # Ex: POST /api/chatbot/chat-memory/
    path('chat-memory/', ChatMemoryView.as_view(), name='chat_memory_save'),

    # Rota para o GET (carregar memória)
    # Ex: GET /api/chatbot/chat-memory/whatsapp:+5511999998888/
    path('chat-memory/<str:session_id>/', ChatMemoryView.as_view(), name='chat_memory_load'),
]