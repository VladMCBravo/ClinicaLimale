# backend/core/urls.py
from django.contrib import admin
from django.urls import path, include
# 1. Importe TODAS as views de PDF que você precisa
from prontuario.views import (
    GerarAtestadoPDFView, 
    GerarPrescricaoPDFView, 
    GerarEvolucaoPDFView,
    OpcaoClinicaListView, 
    TemplateRelatorioListView,
    GerarRelatorioPDFView  # <-- 1. IMPORTE A NOVA VIEW
)
from usuarios.views import CustomAuthTokenLoginView, LogoutView
from .views import debug_env_view, list_urls_view

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # --- Rotas de Debug ---
    path('api/debug/urls/', list_urls_view, name='debug-urls'),
    path('debug/env/', debug_env_view, name='debug-env'),

    # --- Rotas de Autenticação ---
    path('api/auth/login/', CustomAuthTokenLoginView.as_view(), name='custom_login'),
    path('api/auth/logout/', LogoutView.as_view(), name='custom_logout'),
    
    # --- Rotas Principais dos Aplicativos ---
    path('api/pacientes/', include('pacientes.urls')),
    path('api/agendamentos/', include('agendamentos.urls')),
    path('api/usuarios/', include('usuarios.urls')),
    path('api/faturamento/', include('faturamento.urls')),
    path('api/chatbot/', include('chatbot.urls')),
    path('api/integracao/pacientes/<int:paciente_id>/', include('integracao_dicom.urls')),
    
    # --- Rotas do Prontuário ---
    
    # 1. Rota Específica (Legado/Outras abas): Exige ID na URL
    # URL: /api/prontuario/pacientes/1/evolucoes/
    path('api/prontuario/pacientes/<int:paciente_id>/', include('prontuario.urls')),

    # 2. Rota Genérica (CORREÇÃO ESSENCIAL):
    # Permite acessar /api/prontuario/laudos/ (definido em prontuario/urls.py)
    # Sem isso, o frontend recebe 404 ao tentar salvar o laudo.
    path('api/prontuario/', include('prontuario.urls')),

    # --- Rotas Auxiliares ---
    path('api/prontuario/opcoes-clinicas/', OpcaoClinicaListView.as_view(), name='lista-opcoes-clinicas'),
    path('api/prontuario/templates/', TemplateRelatorioListView.as_view(), name='template-relatorio-list'),

    # --- Rotas de PDF ---
    path('api/pdf/evolucao/<int:evolucao_id>/', GerarEvolucaoPDFView.as_view(), name='gerar-evolucao-pdf'),
    path('api/pdf/prescricao/<int:prescricao_id>/', GerarPrescricaoPDFView.as_view(), name='gerar-prescricao-pdf'),
    path('api/pdf/atestado/<int:atestado_id>/', GerarAtestadoPDFView.as_view(), name='gerar-atestado-pdf'),
    path('api/pdf/relatorio/<int:relatorio_id>/', GerarRelatorioPDFView.as_view(), name='pdf_relatorio'),

    # REMOVIDO: path('api/laudos/', include('laudos.urls')) -> Isso estava errado
    # REMOVIDO: path('api/exames/', include('exames.urls')) -> Remova se não tiver criado o app 'exames'
]