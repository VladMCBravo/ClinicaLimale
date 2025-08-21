# backend/usuarios/urls.py - VERSÃO SIMPLIFICADA
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicoListView, UserViewSet # Removemos a importação de login/logout

router = DefaultRouter()
router.register(r'usuarios', UserViewSet, basename='usuario')

urlpatterns = [
    # Removemos as rotas de login/logout daqui
    path('medicos/', MedicoListView.as_view(), name='lista_medicos'),
    path('', include(router.urls)),
]