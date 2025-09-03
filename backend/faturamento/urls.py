# faturamento/urls.py - VERSÃO FINAL E CORRETA

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AgendamentosFaturaveisAPIView, PagamentosPendentesListAPIView,
    PagamentoViewSet,
    CategoriaDespesaViewSet,
    DespesaViewSet,
    RelatorioFinanceiroAPIView,
    ConvenioViewSet,
    PlanoConvenioViewSet,
    PagamentosPendentesListAPIView,
    GerarLoteFaturamentoAPIView,
    ProcedimentoViewSet,
    TussUploadView
)

# O router regista os ViewSets (que criam múltiplas URLs)
router = DefaultRouter()
router.register(r'pagamentos', PagamentoViewSet, basename='pagamento')
router.register(r'categorias-despesa', CategoriaDespesaViewSet, basename='categoria-despesa')
router.register(r'despesas', DespesaViewSet, basename='despesa')
router.register(r'convenios', ConvenioViewSet, basename='convenio')
router.register(r'planos', PlanoConvenioViewSet, basename='plano')
router.register(r'procedimentos', ProcedimentoViewSet, basename='procedimento')

# urlpatterns regista as views individuais
urlpatterns = [
    # A rota para o relatório
    path('relatorios/financeiro/', RelatorioFinanceiroAPIView.as_view(), name='relatorio-financeiro'),

    # --- ESTA É A LINHA QUE ESTAVA A FALTAR ---
    # Adiciona a rota para a nossa lista de pagamentos pendentes
    path('pagamentos-pendentes/', PagamentosPendentesListAPIView.as_view(), name='pagamentos-pendentes'),

# 2. Adicione a nova rota para o Faturamento TISS
    path('agendamentos-faturaveis/', AgendamentosFaturaveisAPIView.as_view(), name='agendamentos-faturaveis'),

    # Inclui todas as rotas geradas pelo router (como /pagamentos/, /convenios/, etc.)
    path('', include(router.urls)),

    path('gerar-lote/', GerarLoteFaturamentoAPIView.as_view(), name='gerar-lote'),
    path('procedimentos/upload-tuss/', TussUploadView.as_view(), name='upload_tuss'),
]