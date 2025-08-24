# backend/agendamentos/urls.py - VERSÃO CORRIGIDA

from django.urls import path
from .views import (
    AgendamentoListCreateAPIView, 
    AgendamentoDetailAPIView,
    AgendamentosNaoPagosListAPIView,
    AgendamentosHojeListView,
    DebugLembretesView # <-- 1. Importe a nova view
)

urlpatterns = [
    # A raiz '' agora corresponde a /api/agendamentos/
    path('', AgendamentoListCreateAPIView.as_view(), name='lista-agendamentos'),
    
    # O caminho '<int:pk>/' corresponde a /api/agendamentos/5/
    path('<int:pk>/', AgendamentoDetailAPIView.as_view(), name='detalhe-agendamento'),
    
    # O caminho 'nao-pagos/' corresponde a /api/agendamentos/nao-pagos/
    path('nao-pagos/', AgendamentosNaoPagosListAPIView.as_view(), name='lista-agendamentos-nao-pagos'),
    
    # O caminho 'hoje/' corresponde a /api/agendamentos/hoje/
    path('hoje/', AgendamentosHojeListView.as_view(), name='lista-agendamentos-hoje'),

     path('debug-lembretes/', DebugLembretesView.as_view(), name='debug-lembretes'),
]