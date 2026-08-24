# chat/serializers.py
from rest_framework import serializers
from .models import Message

class MessageSerializer(serializers.ModelSerializer):
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'content', 'attachment_type', 'attachment_id', 'created_at', 'is_mine']

    def get_is_mine(self, obj):
        request = self.context.get('request')
        # Verifica se o remetente é o usuário que fez a requisição
        if request and hasattr(request, 'user'):
            return obj.sender == request.user
        return False