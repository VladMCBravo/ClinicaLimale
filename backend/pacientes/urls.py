# backend/pacientes/urls.py - VERSÃO FINAL CORRIGIDA

from django.urls import path, include
from .views import PacienteListCreateAPIView, PacienteDetailAPIView 

urlpatterns = [
    # /api/pacientes/ -> Lista todos os pacientes
    path('', PacienteListCreateAPIView.as_view(), name='lista-pacientes'),

    # /api/pacientes/39/ -> Mostra os detalhes do paciente 39
    path('<int:pk>/', PacienteDetailAPIView.as_view(), name='detalhe-paciente'),

    # /api/pacientes/39/prontuario/... -> Direciona para as URLs do prontuário
    path('<int:paciente_id>/prontuario/', include('prontuario.urls')),
]