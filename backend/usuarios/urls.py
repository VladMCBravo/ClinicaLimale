# backend/usuarios/urls.py - VERSÃO FINAL E CORRETA

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomUserViewSet,
    EspecialidadeViewSet,
    JornadaTrabalhoViewSet,
    UserMeView,
    CertificadoUploadView,
    VerificarCertificadoView,
    MedicosComJornadaListView,
    BaterPontoView,
    ConfiguracaoClinicaView,
    RegistroPontoAdminViewSet
)

# O Router é a forma padrão do Django Rest Framework de criar
# todas as rotas para um ViewSet (listar, criar, detalhar, editar, deletar).
router = DefaultRouter()
router.register(r'usuarios', CustomUserViewSet, basename='usuario', )
router.register(r'especialidades', EspecialidadeViewSet, basename='especialidade')
router.register(r'jornadas', JornadaTrabalhoViewSet, basename='jornada')
router.register(r'ponto/admin', RegistroPontoAdminViewSet, basename='ponto-admin')
# As urlpatterns agora incluem as rotas de autenticação
# e todas as rotas geradas pelo router.
urlpatterns = [
    # Esta linha inclui todas as URLs geradas pelo router
    # Ex: /api/usuarios/, /api/usuarios/<id>/, /api/especialidades/, etc.
    path('me/', UserMeView.as_view(), name='user-me'),
    path('me/certificado/', CertificadoUploadView.as_view(), name='user-certificado'), # <-- Nova rota aqui
    path('me/certificado/verificar/', VerificarCertificadoView.as_view(), name='user-certificado-verificar'),
    path('medicos-com-jornada/', MedicosComJornadaListView.as_view(), name='medicos-com-jornada'),
    
    # Rota de Ponto Eletrônico
    path('ponto/bater/', BaterPontoView.as_view(), name='bater-ponto'),

    # Configurações da Clínica
    path('clinica/configuracao/', ConfiguracaoClinicaView.as_view(), name='clinica-configuracao'),
    
    path('', include(router.urls)),
]