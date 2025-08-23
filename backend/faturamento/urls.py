# faturamento/urls.py - VERSÃO FINAL

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    # 1. PagamentoCreateAPIView removida da importação
    PagamentoViewSet, # <-- Importamos o novo ViewSet
    CategoriaDespesaViewSet, 
    DespesaViewSet,
    RelatorioFinanceiroAPIView,
    ConvenioViewSet,
    PlanoConvenioViewSet,
    PagamentosPendentesListAPIView
)

router = DefaultRouter()
# 2. Registamos o novo ViewSet de Pagamento. Isto cria as URLs /pagamentos/ e /pagamentos/<id>/
router.register(r'pagamentos', PagamentoViewSet, basename='pagamento')
router.register(r'categorias-despesa', CategoriaDespesaViewSet, basename='categoria-despesa')
router.register(r'despesas', DespesaViewSet, basename='despesa')
router.register(r'convenios', ConvenioViewSet, basename='convenio')
router.register(r'planos', PlanoConvenioViewSet, basename='plano')


urlpatterns = [
    # 3. A rota antiga foi REMOVIDA daqui. O router agora trata disto.
    path('relatorios/financeiro/', RelatorioFinanceiroAPIView.as_view(), name='relatorio-financeiro'),
    path('pagamentos-pendentes/', PagamentosPendentesListAPIView.as_view(), name='pagamentos-pendentes'),
    path('', include(router.urls)), # Inclui todas as rotas registadas no router
]