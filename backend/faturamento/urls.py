from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PagamentoCreateAPIView, 
    CategoriaDespesaViewSet, 
    DespesaViewSet,
    RelatorioFinanceiroAPIView # A importação que faltava
)

router = DefaultRouter()
router.register(r'categorias-despesa', CategoriaDespesaViewSet, basename='categoria-despesa')
router.register(r'despesas', DespesaViewSet, basename='despesa')

urlpatterns = [
    # Sua rota de pagamento existente
    path('pagamentos/', PagamentoCreateAPIView.as_view(), name='criar-pagamento'),
    
    # A nova rota para o relatório
    path('relatorios/financeiro/', RelatorioFinanceiroAPIView.as_view(), name='relatorio-financeiro'),

    # Inclui as rotas geradas pelo roteador (/despesas/, /categorias-despesa/)
    path('', include(router.urls)),
]