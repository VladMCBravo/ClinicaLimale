# backend/usuarios/urls.py - VERSÃO FINAL E CORRETA

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomAuthTokenLoginView,
    LogoutView,
    CustomUserViewSet,
    EspecialidadeViewSet
)

# O Router é a forma padrão do Django Rest Framework de criar
# todas as rotas para um ViewSet (listar, criar, detalhar, editar, deletar).
router = DefaultRouter()
router.register(r'usuarios', CustomUserViewSet, basename='usuario')
router.register(r'especialidades', EspecialidadeViewSet, basename='especialidade')

# As urlpatterns agora incluem as rotas de autenticação
# e todas as rotas geradas pelo router.
urlpatterns = [
    path('login/', CustomAuthTokenLoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    # Esta linha inclui todas as URLs geradas pelo router
    # Ex: /api/usuarios/, /api/usuarios/<id>/, /api/especialidades/, etc.
    path('', include(router.urls)),
]