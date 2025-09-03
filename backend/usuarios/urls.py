# backend/usuarios/urls.py - VERSÃO ATUALIZADA

from django.urls import path, include
from rest_framework.routers import DefaultRouter
# 1. Importe a nova ViewSet
from .views import MedicoListView, UserViewSet, EspecialidadeViewSet

router = DefaultRouter()
router.register(r'usuarios', UserViewSet, basename='usuario')
# 2. Registre a nova rota para especialidades
router.register(r'especialidades', EspecialidadeViewSet, basename='especialidade')


urlpatterns = [
    path('medicos/', MedicoListView.as_view(), name='lista_medicos'),
    # 3. O include do router agora serve as duas rotas: /usuarios e /especialidades
    path('', include(router.urls)),
]