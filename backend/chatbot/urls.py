# chatbot/urls.py - VERSÃO FINAL PADRONIZADA

from django.urls import path
from .views import (
    chatbot_orchestrator,
    AgendamentoChatbotView,
    VerificarPacienteView,
    VerificarSegurancaView,
    ListarProcedimentosView,
    ConsultarHorariosDisponiveisView,
    CadastrarPacienteView,
    ConsultarAgendamentosPacienteView,
    # --- NOVAS VIEWS IMPORTADAS ---
    ListarEspecialidadesView,
    ListarMedicosPorEspecialidadeView,
)

urlpatterns = [
    # --- Gerenciamento de Memória ---
    path('orchestrator/', chatbot_orchestrator, name='chatbot_orchestrator'),

    # --- Pacientes ---
    path('pacientes/cadastrar/', CadastrarPacienteView.as_view(), name='chatbot_cadastrar_paciente'),
    path('pacientes/verificar/', VerificarPacienteView.as_view(), name='chatbot_verificar_paciente'),
    path('pacientes/verificar-seguranca/', VerificarSegurancaView.as_view(), name='chatbot_verificar_seguranca'),
    path('pacientes/meus-agendamentos/', ConsultarAgendamentosPacienteView.as_view(), name='chatbot_meus_agendamentos'),

    # --- Consultas de Informações da Clínica (NOVAS ROTAS)---
    path('especialidades/', ListarEspecialidadesView.as_view(), name='chatbot_listar_especialidades'), # <-- NOVA
    path('medicos/', ListarMedicosPorEspecialidadeView.as_view(), name='chatbot_listar_medicos'),       # <-- NOVA
    path('procedimentos/', ListarProcedimentosView.as_view(), name='chatbot_listar_procedimentos'),

    # --- Fluxo de Agendamento ---
    path('agendamentos/horarios-disponiveis/', ConsultarHorariosDisponiveisView.as_view(), name='chatbot_horarios_disponiveis'),
    path('agendamentos/criar/', AgendamentoChatbotView.as_view(), name='chatbot_criar_agendamento'),
    
]