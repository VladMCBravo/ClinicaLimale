# integracao_dicom/urls.py

from django.urls import path
from .views import OrthancNotificationView, ExamesDicomPorPacienteView

urlpatterns = [
    path('notify/', OrthancNotificationView.as_view(), name='orthanc-notify'),
    
    # --- CORREÇÃO APLICADA AQUI ---
    # A rota agora é apenas 'exames/', pois a parte 'pacientes/<id>' já foi definida no core/urls.py
    path(
        'exames/', 
        ExamesDicomPorPacienteView.as_view(), 
        name='listar-exames-paciente'
    ),
]