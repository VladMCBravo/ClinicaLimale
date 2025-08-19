# backend/usuarios/urls.py - VERSÃO COMPLETA

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomAuthTokenLoginView, LogoutView, MedicoListView, UserViewSet

# 1. Criamos um roteador
router = DefaultRouter()
# 2. Registramos nosso ViewSet com o roteador
# O DRF criará as rotas /usuarios/ e /usuarios/{id}/ para nós automaticamente
router.register(r'usuarios', UserViewSet, basename='usuario')

urlpatterns = [
    # Rotas existentes
    path('login/', CustomAuthTokenLoginView.as_view(), name='api_login'),
    path('logout/', LogoutView.as_view(), name='api_logout'),
    path('medicos/', MedicoListView.as_view(), name='lista_medicos'),
    
    # 3. Incluímos as rotas geradas pelo roteador
    path('', include(router.urls)),
]