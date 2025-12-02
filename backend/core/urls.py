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
    
    # --- Rotas do Prontuário (prefixadas por paciente_id) ---
    # Esta é a rota principal para acessar dados DENTRO de um prontuário
    path('api/prontuario/pacientes/<int:paciente_id>/', include('prontuario.urls')),

    # --- Rotas do Prontuário (Gerais, sem paciente_id) ---
    # Usadas para buscar dados genéricos
    path('api/prontuario/opcoes-clinicas/', OpcaoClinicaListView.as_view(), name='lista-opcoes-clinicas'),
    path('api/prontuario/templates/', TemplateRelatorioListView.as_view(), name='template-relatorio-list'),

    # --- ROTAS DE PDF (CORRIGIDAS E CENTRALIZADAS) ---
    # Todas as rotas de PDF devem começar com /api/pdf/ para padronização.
    # O frontend está chamando estas URLs.
    
    # URL: /api/pdf/evolucao/1/
    path('api/pdf/evolucao/<int:evolucao_id>/', 
         GerarEvolucaoPDFView.as_view(), 
         name='gerar-evolucao-pdf'),
         
    # URL: /api/pdf/prescricao/3/
    path('api/pdf/prescricao/<int:prescricao_id>/', 
         GerarPrescricaoPDFView.as_view(), 
         name='gerar-prescricao-pdf'),
         
    # URL: /api/pdf/atestado/2/
    path('api/pdf/atestado/<int:atestado_id>/', 
         GerarAtestadoPDFView.as_view(), 
         name='gerar-atestado-pdf'),
 
    # --- 2. ADICIONE ESTA NOVA LINHA ---
    path('api/pdf/relatorio/<int:relatorio_id>/', GerarRelatorioPDFView.as_view(), name='pdf_relatorio'),
    path('api/laudos/', include('laudos.urls')), # <--- Adicione esta linha
    path('api/exames/', include('exames.urls')),
]