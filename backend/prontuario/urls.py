# backend/prontuario/urls.py - VERSÃO FINAL

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views


# 2. O router é usado para ViewSets, como o de DocumentoPaciente
router = DefaultRouter()
router.register(r'documentos', views.DocumentoPacienteViewSet, basename='documento-paciente')

# Lista de todas as URLs que este aplicativo 'prontuario' gerencia
urlpatterns = [
    # Rotas para os diferentes recursos do prontuário
    path('anamnese/', views.AnamneseDetailAPIView.as_view(), name='detalhe-anamnese'),
    
    # --- 3. SUBSTITUIÇÃO DAS ROTAS DE EVOLUÇÃO ---
    # Esta era a linha com erro, pois 'EvolucaoListCreateAPIView' não existe mais
    # path('evolucoes/', views.EvolucaoListCreateAPIView.as_view(), name='lista-criar-evolucoes'),

    # AQUI ESTÁ A CORREÇÃO:
    # A rota 'evolucoes/' agora SÓ LISTA (GET)
    path('evolucoes/', views.EvolucaoListAPIView.as_view(), name='lista-evolucoes'),
    
    # Novas rotas de CRIAÇÃO (POST) para cada especialidade
    path('evolucoes-pediatria/', views.EvolucaoPediatriaCreateAPIView.as_view(), name='criar-evolucao-pediatria'),
    path('evolucoes-cardiologia/', views.EvolucaoCardiologiaCreateAPIView.as_view(), name='criar-evolucao-cardiologia'),
    # (Adicione as outras especialidades aqui...)
    
    # --- FIM DA CORREÇÃO ---
    
    # Esta rota está correta
    path('evolucoes/<int:pk>/', views.EvolucaoDetailAPIView.as_view(), name='detalhe-evolucao'),
    
    path('prescricoes/', views.PrescricaoListCreateAPIView.as_view(), name='listar-criar-prescricoes'),
    path('atestados/', views.AtestadoListCreateAPIView.as_view(), name='listar-criar-atestados'),
    
    # --- 4. LIMPEZA DE ROTA DUPLICADA ---
    # Esta linha foi removida, pois o 'router' abaixo já cuida da rota 'documentos/'
    # path('documentos/', DocumentoPacienteViewSet.as_view({'get': 'list', 'post': 'create'}), name='listar-criar-documentos'),
    
    # --- Rotas de DNPM (Corretas) ---
    path('marcos-dnpm/', views.MarcoDNPMListCreateView.as_view(), name='listar-criar-marcos-dnpm'),
    path('marcos-dnpm/<int:pk>/', views.MarcoDNPMDetailView.as_view(), name='detalhe-marco-dnpm'),
    path('dnpm-status/', views.DNPMStatusView.as_view(), name='status-dnpm'),
    
    # --- Rotas de Vacina (Corretas) ---
    path('vacinas/', views.VacinaPacienteListCreateView.as_view(), name='listar-criar-vacinas'),
    path('vacinas/<int:pk>/', views.VacinaPacienteDetailView.as_view(), name='detalhe-vacina'),
    path('vacinas-status/', views.VacinaStatusView.as_view(), name='status-vacina'),
    
    # --- Rotas de Relatório (Corretas) ---
    path('relatorios/', views.RelatorioSalvoListView.as_view(), name='relatorio-salvo-list'),
    path('relatorios/criar/', views.RelatorioSalvoCreateView.as_view(), name='relatorio-salvo-create'),
    path('gerar-preview-relatorio/', views.GerarPreviewRelatorioView.as_view(), name='gerar-preview-relatorio'),

    # Esta linha inclui automaticamente a rota 'documentos/' (e outras do router)
    path('', include(router.urls)),
]