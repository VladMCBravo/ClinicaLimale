# backend/dashboard/urls.py
from django.urls import path
from .views import DashboardStatsAPIView, AniversariantesAPIView # Adicione AniversariantesAPIView

urlpatterns = [
    path('dashboard-stats/', DashboardStatsAPIView.as_view(), name='dashboard-stats'),
    path('aniversariantes/', AniversariantesAPIView.as_view(), name='dashboard-aniversariantes'),
]