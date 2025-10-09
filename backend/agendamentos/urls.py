# backend/agendamentos/urls.py - VERSÃO LIMPA

from django.urls import path
from .views import (
    AgendamentoListCreateAPIView, 
    AgendamentoDetailAPIView,
    SalaListView,
    ListaEsperaListView, # <-- 1. IMPORTE A NOVA VIEW
    AgendamentosNaoPagosListAPIView,
    AgendamentosHojeListView,
    EnviarLembretesCronView,
    CriarSalaTelemedicinaView,
    TelemedicinaListView,
    ExecutarCancelamentosExpiradosView,
    VerificarCapacidadeHorarioAPIView,
    HorariosDisponiveisAPIView
)

urlpatterns = [
    path('', AgendamentoListCreateAPIView.as_view(), name='lista-agendamentos'),
    path('<int:pk>/', AgendamentoDetailAPIView.as_view(), name='detalhe-agendamento'),
    path('nao-pagos/', AgendamentosNaoPagosListAPIView.as_view(), name='lista-agendamentos-nao-pagos'),
    path('horarios-disponiveis/', HorariosDisponiveisAPIView.as_view(), name='horarios-disponiveis'),
    path('salas/', SalaListView.as_view(), name='lista-salas'),
    path('espera/', ListaEsperaListView.as_view(), name='lista-espera'),
    path('hoje/', AgendamentosHojeListView.as_view(), name='lista-agendamentos-hoje'),
    path('cron/enviar-lembretes/', EnviarLembretesCronView.as_view(), name='cron-enviar-lembretes'),
    path('<int:agendamento_id>/criar-telemedicina/', CriarSalaTelemedicinaView.as_view(), name='criar-telemedicina'),
    path('telemedicina/', TelemedicinaListView.as_view(), name='lista-telemedicina'),
    path('executar-cancelamentos/', ExecutarCancelamentosExpiradosView.as_view(), name='executar-cancelamentos'),
    path('verificar-capacidade/', VerificarCapacidadeHorarioAPIView.as_view(), name='verificar-capacidade'),
]