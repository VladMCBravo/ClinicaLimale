# backend/prontuario/urls.py - VERSÃO FINAL

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EvolucaoListCreateAPIView,
    PrescricaoListCreateAPIView,
    AnamneseDetailAPIView,
    AtestadoListCreateAPIView,
    DocumentoPacienteViewSet,
    OpcaoClinicaListView
)

router = DefaultRouter()
router.register(r'documentos', DocumentoPacienteViewSet, basename='documento-paciente')

urlpatterns = [
    path('evolucoes/', EvolucaoListCreateAPIView.as_view(), name='lista-evolucoes'),
    path('prescricoes/', PrescricaoListCreateAPIView.as_view(), name='lista-prescricoes'),
    path('anamnese/', AnamneseDetailAPIView.as_view(), name='detalhe-anamnese'),
    path('atestados/', AtestadoListCreateAPIView.as_view(), name='lista-atestados'),
    path('opcoes-clinicas/', OpcaoClinicaListView.as_view(), name='lista-opcoes-clinicas'),

    # Inclui as rotas do ViewSet (ex: documentos/)
    path('', include(router.urls)),
]