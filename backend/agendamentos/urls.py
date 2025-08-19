# backend/agendamentos/urls.py - VERSÃO CORRIGIDA

from django.urls import path
from faturamento.views import PagamentoCreateAPIView 
from .views import (
    AgendamentoListCreateAPIView, 
    AgendamentoDetailAPIView,
    AgendamentosNaoPagosListAPIView,
    AgendamentosHojeListView
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

    # O caminho '<int:agendamento_id>/pagamentos/' corresponde a /api/agendamentos/5/pagamentos/
    path('<int:agendamento_id>/pagamentos/', PagamentoCreateAPIView.as_view(), name='criar-pagamento-agendamento'),
]