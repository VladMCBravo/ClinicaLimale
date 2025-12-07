# backend/prontuario/urls.py - VERSÃO SIMPLIFICADA

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'documentos', views.DocumentoPacienteViewSet, basename='documento-paciente')

urlpatterns = [
    path('anamnese/', views.AnamneseDetailAPIView.as_view(), name='detalhe-anamnese'),
    
    # --- ★★★ ROTA ÚNICA PARA EVOLUÇÃO ★★★ ---
    # Esta rota agora lida com GET (Listar) e POST (Criar)
    path('evolucoes/', views.EvolucaoListCreateAPIView.as_view(), name='lista-criar-evolucoes'),
    
    # Esta rota lida com GET/PATCH/DELETE de uma evolução específica
    path('evolucoes/<int:pk>/', views.EvolucaoDetailAPIView.as_view(), name='detalhe-evolucao'),
    
    # --- (Delete todas as rotas 'evolucoes-pediatria/', 'evolucoes-cardiologia/', etc.) ---
    
    # --- OUTRAS ROTAS (Sem alteração) ---
    path('prescricoes/', views.PrescricaoListCreateAPIView.as_view(), name='listar-criar-prescricoes'),
    path('atestados/', views.AtestadoListCreateAPIView.as_view(), name='listar-criar-atestados'),
    
    path('marcos-dnpm/', views.MarcoDNPMListCreateView.as_view(), name='listar-criar-marcos-dnpm'),
    path('marcos-dnpm/<int:pk>/', views.MarcoDNPMDetailView.as_view(), name='detalhe-marco-dnpm'),
    path('dnpm-status/', views.DNPMStatusView.as_view(), name='status-dnpm'),
    
    path('vacinas/', views.VacinaPacienteListCreateView.as_view(), name='listar-criar-vacinas'),
    path('vacinas/<int:pk>/', views.VacinaPacienteDetailView.as_view(), name='detalhe-vacina'),
    path('vacinas-status/', views.VacinaStatusView.as_view(), name='status-vacina'),
    
    path('relatorios/', views.RelatorioSalvoListView.as_view(), name='relatorio-salvo-list'),
    path('relatorios/criar/', views.RelatorioSalvoCreateView.as_view(), name='relatorio-salvo-create'),
    path('gerar-preview-relatorio/', views.GerarPreviewRelatorioView.as_view(), name='gerar-preview-relatorio'),
    path('laudos/', views.LaudoListCreateView.as_view(), name='lista-criar-laudos'),

    path('', include(router.urls)),
]