# backend/prontuario/urls.py - VERSÃO FINAL

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EvolucaoListCreateAPIView,
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
    path('evolucoes/', EvolucaoListCreateAPIView.as_view(), name='lista-evolucoes'),
    path('prescricoes/', PrescricaoListCreateAPIView.as_view(), name='lista-prescricoes'),
    path('atestados/', AtestadoListCreateAPIView.as_view(), name='lista-atestados'),
    path('anamnese/', AnamneseDetailAPIView.as_view(), name='detalhe-anamnese'),

    # Inclui as rotas geradas automaticamente pelo router para o ViewSet de documentos
    path('', include(router.urls)),
]