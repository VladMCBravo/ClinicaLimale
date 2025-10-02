# chatbot/urls.py - VERSÃO MÍNIMA E ESTÁVEL

from django.urls import path
from . import views

urlpatterns = [
    # A rota principal que o n8n chama
    path('orchestrator/', views.chatbot_orchestrator, name='chatbot-orchestrator'),
    
    # A rota de debug que usamos para testar a importação
    path('debug/', views.debug_chatbot_module, name='chatbot-debug'),
]