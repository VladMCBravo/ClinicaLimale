# chatbot/urls.py - VERSÃO ATUALIZADA

from django.urls import path
from .views import (
    ChatMemoryView,
    AgendamentoChatbotView,
    VerificarPacienteView,       # <-- Nova importação
    ListarProcedimentosView,     # <-- Nova importação
    ConsultarHorariosDisponiveisView, # <-- Nova importação
    GerarPixView                 # <-- Nova importação
)

urlpatterns = [
    # --- Gerenciamento de Memória da Conversa ---
    path('chat-memory/', ChatMemoryView.as_view(), name='chat_memory_save'),
    path('chat-memory/<str:session_id>/', ChatMemoryView.as_view(), name='chat_memory_load'),

    # --- Verificação e Consulta de Pacientes ---
    path('pacientes/verificar/', VerificarPacienteView.as_view(), name='chatbot_verificar_paciente'),

    # --- Consultas de Informações da Clínica ---
    path('procedimentos/', ListarProcedimentosView.as_view(), name='chatbot_listar_procedimentos'),

    # --- Fluxo de Agendamento ---
    path('agendamentos/horarios-disponiveis/', ConsultarHorariosDisponiveisView.as_view(), name='chatbot_horarios_disponiveis'),
    path('agendamentos/criar/', AgendamentoChatbotView.as_view(), name='chatbot_criar_agendamento'),
    
    # --- Fluxo de Pagamento ---
    path('pagamentos/gerar-pix/', GerarPixView.as_view(), name='chatbot_gerar_pix'),
]
