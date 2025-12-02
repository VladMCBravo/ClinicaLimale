from django.urls import path
from .views import UploadExameView, AcessarResultadosView

urlpatterns = [
    path('upload/', UploadExameView.as_view(), name='upload_exame'),
    # Nova rota para o paciente:
    path('acessar/', AcessarResultadosView.as_view(), name='acessar_exame'),
]