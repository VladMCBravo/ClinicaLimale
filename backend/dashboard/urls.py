from django.urls import path
from .views import PainelExecutivoView, MetaMensalView

urlpatterns = [
    path('executivo/', PainelExecutivoView.as_view(), name='painel-executivo'),
    path('metas/', MetaMensalView.as_view(), name='config-metas'),
]