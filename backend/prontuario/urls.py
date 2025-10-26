# backend/prontuario/urls.py - VERSÃO FINAL

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EvolucaoListCreateAPIView,
    EvolucaoDetailAPIView,  # 1. IMPORTE A NOVA VIEW AQUI
    PrescricaoListCreateAPIView,
    AnamneseDetailAPIView,
    AtestadoListCreateAPIView,
    DocumentoPacienteViewSet,
    MarcoDNPMListCreateView,       # <-- ADICIONE O NOVO IMPORT
    VacinaPacienteListCreateView,
    MarcoDNPMDetailView,         # <-- ADICIONE O NOVO IMPORT
    VacinaPacienteDetailView     # <-- ADICIONE O NOVO IMPORT
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
    # --- Rotas de DNPM ---
    path('marcos-dnpm/', MarcoDNPMListCreateView.as_view(), name='listar-criar-marcos-dnpm'),
    path('marcos-dnpm/<int:pk>/', MarcoDNPMDetailView.as_view(), name='detalhe-marco-dnpm'), # <-- NOVA ROTA

    # --- Rotas de Vacina ---
    path('vacinas/', VacinaPacienteListCreateView.as_view(), name='listar-criar-vacinas'),
    path('vacinas/<int:pk>/', VacinaPacienteDetailView.as_view(), name='detalhe-vacina'), # <-- NOVA ROTA
    path('', include(router.urls)),
]