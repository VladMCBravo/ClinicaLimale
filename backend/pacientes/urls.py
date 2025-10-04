# backend/pacientes/urls.py - VERSÃO FINAL REVISADA

from django.urls import path, include
from .views import PacienteListCreateAPIView, PacienteDetailAPIView 

urlpatterns = [
    # 1. Rota para listar e criar pacientes: /api/pacientes/
    path('', PacienteListCreateAPIView.as_view(), name='lista-pacientes'),

    # 2. ROTA PARA O PRONTUÁRIO: /api/pacientes/39/prontuario/...
    # Colocamos esta rota ANTES da rota de detalhe para garantir que ela seja encontrada primeiro.
    path('<int:paciente_id>/prontuario/', include('prontuario.urls')),

    # 3. Rota para ver detalhes de um paciente: /api/pacientes/39/
    path('<int:pk>/', PacienteDetailAPIView.as_view(), name='detalhe-paciente'),
]