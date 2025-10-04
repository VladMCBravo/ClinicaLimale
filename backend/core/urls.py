# backend/core/urls.py
from django.contrib import admin
from django.urls import path, include
from prontuario.views import GerarAtestadoPDFView, GerarPrescricaoPDFView
# 1. IMPORTAMOS NOSSAS VIEWS CUSTOMIZADAS DE LOGIN E LOGOUT
from usuarios.views import CustomAuthTokenLoginView, LogoutView
from .views import debug_env_view # <-- 1. Importe a nova view

urlpatterns = [
    path('admin/', admin.site.urls),
    
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
    path('api/atestados/<int:atestado_id>/pdf/', GerarAtestadoPDFView.as_view(), name='gerar-atestado-pdf'),
    path('api/prescricoes/<int:prescricao_id>/pdf/', GerarPrescricaoPDFView.as_view(), name='gerar-prescricao-pdf'),
    path('api/chatbot/', include('chatbot.urls')),
    path('api/integracao/', include('integracao_dicom.urls')),
]