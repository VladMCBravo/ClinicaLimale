# backend/agendamentos/urls.py - VERSÃO LIMPA

from django.urls import path
from .views import (
    AgendamentoListCreateAPIView, 
    AgendamentoDetailAPIView,
    AgendamentosNaoPagosListAPIView,
    AgendamentosHojeListView,
    EnviarLembretesCronView,
    CriarSalaTelemedicinaView,
    TelemedicinaListView,
    ExecutarCancelamentosExpiradosView
)

urlpatterns = [
    path('', AgendamentoListCreateAPIView.as_view(), name='lista-agendamentos'),
    path('<int:pk>/', AgendamentoDetailAPIView.as_view(), name='detalhe-agendamento'),
    path('nao-pagos/', AgendamentosNaoPagosListAPIView.as_view(), name='lista-agendamentos-nao-pagos'),
    path('hoje/', AgendamentosHojeListView.as_view(), name='lista-agendamentos-hoje'),
    path('cron/enviar-lembretes/', EnviarLembretesCronView.as_view(), name='cron-enviar-lembretes'),
    path('<int:agendamento_id>/criar-telemedicina/', CriarSalaTelemedicinaView.as_view(), name='criar-telemedicina'),
    path('telemedicina/', TelemedicinaListView.as_view(), name='lista-telemedicina'),
    # --- NOVA ROTA PARA O N8N ---
    path('executar-cancelamentos/', ExecutarCancelamentosExpiradosView.as_view(), name='executar-cancelamentos'),
]