from django.urls import path
from .views import (
    UploadExameView, 
    AcessarResultadosView, 
    ListarExamesPendentesView, # <---
    ListarExamesDoPacienteView, # <--- VERIFIQUE SE ESTÁ IMPORTADO
    VincularPacienteView,       # <--- 
    AcessarResultadosView,
    ResgatarPorNomeView,         # <--- 
    UltimosExamesEnviadosView,    # <--- 
    WorklistDataView,             # <--- 
    HeartbeatView,
    ReportErrorView
   )

urlpatterns = [
    path('upload/', UploadExameView.as_view(), name='upload_exame'),
    path('acessar/', AcessarResultadosView.as_view(), name='acessar_exame'),
    
    # Novas rotas para a recepção
    path('pendentes/', ListarExamesPendentesView.as_view(), name='exames_pendentes'),
    path('<int:pk>/vincular/', VincularPacienteView.as_view(), name='vincular_exame'),
    # --- A ROTA QUE ESTÁ DANDO 404 ---
    # Verifique se esta linha existe:
    path('exames-paciente/', ListarExamesDoPacienteView.as_view(), name='exames_paciente'),
    path('resgatar-nome/<int:exame_id>/', ResgatarPorNomeView.as_view(), name='resgatar_por_nome'),
    path('recentes/', UltimosExamesEnviadosView.as_view(), name='exames_recentes'),
    # --- ROTA DO SCRIPT DO ULTRASSOM ---
    path('worklist-data/', WorklistDataView.as_view(), name='worklist_data'),
    # --- NOVAS ROTAS DO ROBÔ ---
    path('heartbeat/', HeartbeatView.as_view(), name='robo_heartbeat'),
    path('report-error/', ReportErrorView.as_view(), name='robo_report_error'),
]