# backend/prontuario/urls.py - VERSÃO SIMPLIFICADA

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import buscar_credenciais_ativas, LaudoCreateAsyncView, LaudoStatusView

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
    
    # Rota para buscar templates (Mapeada corretamente para a view)
    path('templates-relatorio/', views.TemplateRelatorioListView.as_view(), name='template-relatorio-list'),

    # Rota corrigida: O backend espera o paciente_id na URL (pacientes/<id>/relatorios/)
    path('pacientes/<int:paciente_id>/relatorios/', views.RelatorioSalvoListView.as_view(), name='relatorio-salvo-list'),
    path('pacientes/<int:paciente_id>/relatorios/criar/', views.RelatorioSalvoCreateView.as_view(), name='relatorio-salvo-create'),
    path('gerar-preview-relatorio/<int:paciente_id>/', views.GerarPreviewRelatorioView.as_view(), name='gerar-preview-relatorio'),
    
    # --- LAUDOS ---
    path('laudos/', views.LaudoListCreateView.as_view(), name='lista-criar-laudos'),
    path('laudos/<int:pk>/', views.LaudoRetrieveUpdateDestroyView.as_view(), name='detalhe-laudo'),
    path('laudos-async/', LaudoCreateAsyncView.as_view(), name='laudo-create-async'),
    path('laudos/<int:pk>/status/', LaudoStatusView.as_view(), name='laudo-status'),

    # =========================================================================
    # ★★★ CORREÇÃO AQUI: ALINHAMENTO COM O FRONTEND ★★★
    # =========================================================================
    
    # 1. Rota para listar os exames dentro do prontuário (aba Exames)
    path('exames-paciente/', views.ListarExamesDoPacienteView.as_view(), name='exames-paciente'),

    # 2. Rota conectada exatamente com o que o LaudosPage.jsx pede!
    # Devolve o objeto contendo { codigo: '...', senha: '...' }
    path('credenciais-ativas/', buscar_credenciais_ativas, name='credenciais-ativas'),

    # --- ROTA UNIVERSAL DE MÁSCARA ---
    path('aplicar-mascara/', views.AplicarMascaraPDFView.as_view(), name='aplicar-mascara-pdf'),

    # =========================================================================
    # ROTAS DO WORKSPACE TASY-LIKE
    # =========================================================================
    path('workspace/banner/<int:paciente_id>/', views.PatientBannerAPIView.as_view(), name='workspace-banner'),
    path('workspace/meus-pacientes/', views.MeusPacientesWorkspaceAPIView.as_view(), name='workspace-meus-pacientes'),
    path('workspace/minhas-consultas/', views.ConsultasWorkspaceAPIView.as_view(), name='workspace-minhas-consultas'),

    path('', include(router.urls)),
]