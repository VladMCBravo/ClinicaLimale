# backend/usuarios/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
# Removemos a importação de login/logout, pois agora estão no core/urls.py
from .views import MedicoListView, UserViewSet 

router = DefaultRouter()
router.register(r'usuarios', UserViewSet, basename='usuario')

urlpatterns = [
    # As rotas de login/logout foram removidas daqui
    path('medicos/', MedicoListView.as_view(), name='lista_medicos'),
    path('', include(router.urls)),
]