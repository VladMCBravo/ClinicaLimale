# chatbot/urls.py - VERSÃO ATUALIZADA

from django.urls import path
from .views import ChatMemoryView, AgendamentoChatbotView # <-- IMPORTE A NOVA VIEW

urlpatterns = [
    # Rotas da Memória do Chat
    path('chat-memory/', ChatMemoryView.as_view(), name='chat_memory_save'),
    path('chat-memory/<str:session_id>/', ChatMemoryView.as_view(), name='chat_memory_load'),

    # --- NOVA ROTA PARA AGENDAMENTO ---
    path('agendamentos/criar/', AgendamentoChatbotView.as_view(), name='chatbot_criar_agendamento'),
]