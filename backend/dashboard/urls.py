# backend/dashboard/urls.py
from django.urls import path
from .views import DashboardDataAPIView # Mude o nome da view importada

urlpatterns = [
    path('', DashboardDataAPIView.as_view(), name='dashboard-data'),
]