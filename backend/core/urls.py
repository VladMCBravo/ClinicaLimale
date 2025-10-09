# backend/core/urls.py
from django.contrib import admin
from django.urls import path, include
from prontuario.views import GerarAtestadoPDFView, GerarPrescricaoPDFView
# 1. IMPORTAMOS NOSSAS VIEWS CUSTOMIZADAS DE LOGIN E LOGOUT
from usuarios.views import CustomAuthTokenLoginView, LogoutView
from .views import debug_env_view, list_urls_view # <-- 1. IMPORTE A NOVA VIEW 'list_urls_view'

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # --- 2. ADICIONE A NOVA ROTA DE DEPURAÇÃO AQUI ---
    path('api/debug/urls/', list_urls_view, name='debug-urls'),

    # --- 2. REGISTRAMOS NOSSAS ROTAS DE AUTENTICAÇÃO DIRETAMENTE AQUI ---
    path('api/auth/login/', CustomAuthTokenLoginView.as_view(), name='custom_login'),
    path('api/auth/logout/', LogoutView.as_view(), name='custom_logout'),
    
    # A linha abaixo foi removida para evitar o conflito
    # path('api/auth/', include('dj_rest_auth.urls')),

# --- 2. ADICIONE ESTA ROTA DE DEPURAÇÃO ---
    # Coloque-a antes das outras rotas de API para garantir que é encontrada primeiro
    path('debug/env/', debug_env_view, name='debug-env'),

    # O resto das suas URLs continua o mesmo
    path('api/pacientes/', include('pacientes.urls')),
    path('api/agendamentos/', include('agendamentos.urls')),
    path('api/usuarios/', include('usuarios.urls')),
    path('api/faturamento/', include('faturamento.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/chatbot/', include('chatbot.urls')),
    path('api/integracao/', include('integracao_dicom.urls')),
    # <<-- A LINHA QUE ESTÁ FALTANDO É ESTA -->>
    # Ela diz ao Django: "Qualquer URL que comece com 'api/prontuario/pacientes/<id_do_paciente>/'
    # deve ser gerenciada pelo arquivo de URLs do app 'prontuario'".
    path('api/prontuario/pacientes/<int:paciente_id>/', include('prontuario.urls')),
    
    # <<-- ADICIONE TAMBÉM AS ROTAS DE PDF QUE ESTÃO FORA DO PADRÃO -->>
    # O seu views.py tem rotas para gerar PDFs que não se encaixam no padrão acima
    path('api/prescricoes/<int:prescricao_id>/pdf/', GerarPrescricaoPDFView.as_view(), name='gerar-prescricao-pdf'),
    path('api/atestados/<int:atestado_id>/pdf/', GerarAtestadoPDFView.as_view(), name='gerar-atestado-pdf'),
]