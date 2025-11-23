from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ModeloLaudoViewSet, LaudoViewSet

router = DefaultRouter()
router.register(r'modelos', ModeloLaudoViewSet)
router.register(r'laudos', LaudoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]