# backend/core/urls.py - VERSÃO CORRIGIDA
from django.contrib import admin
from django.urls import path, include
from prontuario.views import GerarAtestadoPDFView, GerarPrescricaoPDFView
# 1. IMPORTAMOS NOSSAS VIEWS CUSTOMIZADAS DE LOGIN E LOGOUT
from usuarios.views import CustomAuthTokenLoginView, LogoutView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # --- 2. REGISTRAMOS NOSSAS ROTAS DE AUTENTICAÇÃO DIRETAMENTE AQUI ---
    path('api/auth/login/', CustomAuthTokenLoginView.as_view(), name='custom_login'),
    path('api/auth/logout/', LogoutView.as_view(), name='custom_logout'),
    
    # A linha abaixo foi removida para evitar o conflito
    # path('api/auth/', include('dj_rest_auth.urls')),

    # O resto das suas URLs continua o mesmo
    path('api/pacientes/', include('pacientes.urls')),
    path('api/agendamentos/', include('agendamentos.urls')),
    path('api/usuarios/', include('usuarios.urls')),
    path('api/faturamento/', include('faturamento.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/atestados/<int:atestado_id>/pdf/', GerarAtestadoPDFView.as_view(), name='gerar-atestado-pdf'),
    path('api/prescricoes/<int:prescricao_id>/pdf/', GerarPrescricaoPDFView.as_view(), name='gerar-prescricao-pdf'),
]