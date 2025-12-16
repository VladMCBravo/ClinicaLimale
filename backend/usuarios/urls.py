# backend/usuarios/urls.py - VERSÃO FINAL E CORRETA

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomUserViewSet,
    EspecialidadeViewSet,
    JornadaTrabalhoViewSet,
    UserMeView
)

# O Router é a forma padrão do Django Rest Framework de criar
# todas as rotas para um ViewSet (listar, criar, detalhar, editar, deletar).
router = DefaultRouter()
router.register(r'usuarios', CustomUserViewSet, basename='usuario', )
path('me/', UserMeView.as_view(), name='user-me'), # <--- ADICIONE ESTA LINHA
router.register(r'especialidades', EspecialidadeViewSet, basename='especialidade')
router.register(r'jornadas', JornadaTrabalhoViewSet, basename='jornada')
# As urlpatterns agora incluem as rotas de autenticação
# e todas as rotas geradas pelo router.
urlpatterns = [
    # Esta linha inclui todas as URLs geradas pelo router
    # Ex: /api/usuarios/, /api/usuarios/<id>/, /api/especialidades/, etc.
    path('', include(router.urls)),
]