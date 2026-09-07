from django.urls import path
from .views import SubscribePushAPIView

urlpatterns = [
    path('subscribe/', SubscribePushAPIView.as_view(), name='push-subscribe'),
]
