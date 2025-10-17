# backend/prontuario/urls.py - VERSÃO FINAL

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EvolucaoListCreateAPIView,
    EvolucaoDetailAPIView,  # 1. IMPORTE A NOVA VIEW AQUI
    PrescricaoListCreateAPIView,
    AnamneseDetailAPIView,
    AtestadoListCreateAPIView,
    DocumentoPacienteViewSet
)

# O router é usado para ViewSets, como o de DocumentoPaciente
router = DefaultRouter()
router.register(r'documentos', DocumentoPacienteViewSet, basename='documento-paciente')

# Lista de todas as URLs que este aplicativo 'prontuario' gerencia
urlpatterns = [
    # Rotas para os diferentes recursos do prontuário
    path('anamnese/', AnamneseDetailAPIView.as_view(), name='detalhe-anamnese'),
    path('evolucoes/', EvolucaoListCreateAPIView.as_view(), name='listar-criar-evolucoes'),
    # Esta rota captura o ID da evolução (pk) e o envia para a EvolucaoDetailAPIView
    path('evolucoes/<int:pk>/', EvolucaoDetailAPIView.as_view(), name='detalhe-evolucao'),
    path('prescricoes/', PrescricaoListCreateAPIView.as_view(), name='listar-criar-prescricoes'),
    path('atestados/', AtestadoListCreateAPIView.as_view(), name='listar-criar-atestados'),
    path('documentos/', DocumentoPacienteViewSet.as_view({'get': 'list', 'post': 'create'}), name='listar-criar-documentos'),
    # Inclui as rotas geradas automaticamente pelo router para o ViewSet de documentos
    path('', include(router.urls)),
]