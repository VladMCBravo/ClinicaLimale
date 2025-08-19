# backend/dashboard/urls.py
from django.urls import path
from .views import DashboardStatsAPIView

urlpatterns = [
    path('dashboard-stats/', DashboardStatsAPIView.as_view(), name='dashboard-stats'),
]