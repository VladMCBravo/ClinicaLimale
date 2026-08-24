# chat/views.py
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Message
from .serializers import MessageSerializer

class ChatHistoryAPIView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        contact_id = self.request.query_params.get('contact_id')
        
        if not contact_id:
            return Message.objects.none()

        # Busca histórico de ida e volta e ordena do mais antigo pro mais novo
        return Message.objects.filter(
            Q(sender=user, receiver_id=contact_id) |
            Q(sender_id=contact_id, receiver=user)
        ).order_by('created_at')