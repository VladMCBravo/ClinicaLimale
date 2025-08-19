
from django.contrib import admin
from django.urls import path, include
from prontuario.views import GerarAtestadoPDFView, GerarPrescricaoPDFView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('dj_rest_auth.urls')),

    # Cada app tem seu próprio "namespace" dentro da API
    path('api/pacientes/', include('pacientes.urls')),
    path('api/agendamentos/', include('agendamentos.urls')),
    path('api/usuarios/', include('usuarios.urls')),
    #path('api/prontuario/', include('prontuario.urls')),
    path('api/faturamento/', include('faturamento.urls')),
    path('api/dashboard/', include('dashboard.urls')),

    # 2. ADICIONE AS ROTAS DE PDF AQUI
    path('api/atestados/<int:atestado_id>/pdf/', GerarAtestadoPDFView.as_view(), name='gerar-atestado-pdf'),
    path('api/prescricoes/<int:prescricao_id>/pdf/', GerarPrescricaoPDFView.as_view(), name='gerar-prescricao-pdf'),
]