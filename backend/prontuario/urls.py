# backend/prontuario/urls.py - VERSÃO FINAL COMPLETA

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views


# O router é usado para ViewSets, como o de DocumentoPaciente
router = DefaultRouter()
router.register(r'documentos', views.DocumentoPacienteViewSet, basename='documento-paciente')

# Lista de todas as URLs que este aplicativo 'prontuario' gerencia
urlpatterns = [
    # Rota de Anamnese (Histórico Mestre)
    path('anamnese/', views.AnamneseDetailAPIView.as_view(), name='detalhe-anamnese'),
    
    # --- ROTAS DE EVOLUÇÃO (CONSULTA) ---
    
    # Rota para LISTAR (GET) todas as evoluções
    path('evolucoes/', views.EvolucaoListAPIView.as_view(), name='lista-evolucoes'),
    
    # Rota para VER/ATUALIZAR (GET/PATCH) uma evolução específica
    path('evolucoes/<int:pk>/', views.EvolucaoDetailAPIView.as_view(), name='detalhe-evolucao'),
    
    # Rotas para CRIAR (POST) evoluções por especialidade
    path('evolucoes-pediatria/', views.EvolucaoPediatriaCreateAPIView.as_view(), name='criar-evolucao-pediatria'),
    path('evolucoes-neonatologia/', views.EvolucaoNeonatologiaCreateAPIView.as_view(), name='criar-evolucao-neonatologia'),
    path('evolucoes-cardiologia/', views.EvolucaoCardiologiaCreateAPIView.as_view(), name='criar-evolucao-cardiologia'),
    path('evolucoes-clinica-geral/', views.EvolucaoClinicaGeralCreateAPIView.as_view(), name='criar-evolucao-clinica-geral'),
    path('evolucoes-ginecologia/', views.EvolucaoGinecologiaCreateAPIView.as_view(), name='criar-evolucao-ginecologia'),
    path('evolucoes-ortopedia/', views.EvolucaoOrtopediaCreateAPIView.as_view(), name='criar-evolucao-ortopedia'),
    path('evolucoes-ecocardiografia/', views.EvolucaoEcocardiografiaCreateAPIView.as_view(), name='criar-evolucao-ecocardiografia'),
    path('evolucoes-neurologia/', views.EvolucaoNeurologiaCreateAPIView.as_view(), name='criar-evolucao-neurologia'),
    path('evolucoes-obstetricia/', views.EvolucaoObstetriciaCreateAPIView.as_view(), name='criar-evolucao-obstetricia'),
    path('evolucoes-reumatologia-pediatrica/', views.EvolucaoReumatologiaPediatricaCreateAPIView.as_view(), name='criar-evolucao-reumatologia-pediatrica'),
    
    # --- OUTRAS ROTAS DO PRONTUÁRIO ---
    
    path('prescricoes/', views.PrescricaoListCreateAPIView.as_view(), name='listar-criar-prescricoes'),
    path('atestados/', views.AtestadoListCreateAPIView.as_view(), name='listar-criar-atestados'),
    
    # --- Rotas de DNPM ---
    path('marcos-dnpm/', views.MarcoDNPMListCreateView.as_view(), name='listar-criar-marcos-dnpm'),
    path('marcos-dnpm/<int:pk>/', views.MarcoDNPMDetailView.as_view(), name='detalhe-marco-dnpm'),
    path('dnpm-status/', views.DNPMStatusView.as_view(), name='status-dnpm'),
    
    # --- Rotas de Vacina ---
    path('vacinas/', views.VacinaPacienteListCreateView.as_view(), name='listar-criar-vacinas'),
    path('vacinas/<int:pk>/', views.VacinaPacienteDetailView.as_view(), name='detalhe-vacina'),
    path('vacinas-status/', views.VacinaStatusView.as_view(), name='status-vacina'),
    
    # --- Rotas de Relatório ---
    path('relatorios/', views.RelatorioSalvoListView.as_view(), name='relatorio-salvo-list'),
    path('relatorios/criar/', views.RelatorioSalvoCreateView.as_view(), name='relatorio-salvo-create'),
    path('gerar-preview-relatorio/', views.GerarPreviewRelatorioView.as_view(), name='gerar-preview-relatorio'),

    # Rota do Router (para Documentos)
    path('', include(router.urls)),
]