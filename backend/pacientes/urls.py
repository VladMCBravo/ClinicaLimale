# backend/pacientes/urls.py - VERSÃO CORRIGIDA
from django.urls import path, include
# Assumindo que suas views se chamam PacienteListCreateAPIView e PacienteDetailAPIView
# Se os nomes forem diferentes (ex: PacienteViewSet), ajuste o import
from .views import PacienteListCreateAPIView, PacienteDetailAPIView 

urlpatterns = [
    # A raiz '' agora corresponde a /api/pacientes/
    path('', PacienteListCreateAPIView.as_view(), name='lista-pacientes'),

    # O caminho '<int:pk>/' corresponde a /api/pacientes/5/
    path('<int:pk>/', PacienteDetailAPIView.as_view(), name='detalhe-paciente'),

    # NOVA LINHA: Qualquer URL como /api/pacientes/3/... será enviada para o prontuário.
    path('<int:paciente_id>/', include('prontuario.urls')),
]