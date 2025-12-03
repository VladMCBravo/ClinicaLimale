from django.urls import path
from .views import (
    UploadExameView, 
    AcessarResultadosView, 
    ListarExamesPendentesView, # <--- Novo
    VincularPacienteView       # <--- Novo
)

urlpatterns = [
    path('upload/', UploadExameView.as_view(), name='upload_exame'),
    path('acessar/', AcessarResultadosView.as_view(), name='acessar_exame'),
    
    # Novas rotas para a recepção
    path('pendentes/', ListarExamesPendentesView.as_view(), name='exames_pendentes'),
    path('<int:pk>/vincular/', VincularPacienteView.as_view(), name='vincular_exame'),
]