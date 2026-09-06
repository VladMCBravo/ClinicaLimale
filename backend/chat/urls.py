# chat/urls.py
from django.urls import path
from .views import ChatHistoryAPIView, UserChatRoomsAPIView

urlpatterns = [
    path('history/', ChatHistoryAPIView.as_view(), name='chat-history'),
    path('rooms/', UserChatRoomsAPIView.as_view(), name='chat-rooms'), # <-- Rota Nova!
]