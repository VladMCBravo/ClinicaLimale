from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PagamentoCreateAPIView, 
    CategoriaDespesaViewSet, 
    DespesaViewSet,
    RelatorioFinanceiroAPIView,
    ConvenioViewSet,
    PlanoConvenioViewSet
)

router = DefaultRouter()
router.register(r'categorias-despesa', CategoriaDespesaViewSet, basename='categoria-despesa')
router.register(r'despesas', DespesaViewSet, basename='despesa')
router.register(r'convenios', ConvenioViewSet, basename='convenio')
router.register(r'planos', PlanoConvenioViewSet, basename='plano')

urlpatterns = [
    # Sua rota de pagamento existente
    path('pagamentos/', PagamentoCreateAPIView.as_view(), name='criar-pagamento'),
    
    # A nova rota para o relatório
    path('relatorios/financeiro/', RelatorioFinanceiroAPIView.as_view(), name='relatorio-financeiro'),

    # Inclui as rotas geradas pelo roteador (/despesas/, /categorias-despesa/)
    path('', include(router.urls)),
]