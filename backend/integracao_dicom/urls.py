# integracao_dicom/urls.py

from django.urls import path
from .views import OrthancNotificationView, ExamesDicomPorPacienteView # <-- 1. IMPORTE A NOVA VIEW

urlpatterns = [
    path('notify/', OrthancNotificationView.as_view(), name='orthanc-notify'),
    
    # --- 2. ADICIONE ESTA NOVA ROTA ---
    # A rota espera um inteiro (int) que será o ID do paciente.
    path(
        'pacientes/<int:paciente_id>/exames/', 
        ExamesDicomPorPacienteView.as_view(), 
        name='listar-exames-paciente'
    ),
]