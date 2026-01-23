# backend/crm/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CicloViewSet, ProximaAcaoViewSet, AnaliseComportamentalViewSet

router = DefaultRouter()
router.register(r'ciclos', CicloViewSet, basename='ciclos')
router.register(r'acoes', ProximaAcaoViewSet, basename='acoes')
router.register(r'comportamento', AnaliseComportamentalViewSet, basename='comportamento')

urlpatterns = [
    path('', include(router.urls)),
]