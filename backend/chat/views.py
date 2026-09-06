from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q

from .models import Message, ChatRoom
from .serializers import MessageSerializer

class ChatHistoryAPIView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        contact_id = self.request.query_params.get('contact_id')
        room_id = self.request.query_params.get('room_id')  # <-- NOVO PARÂMETRO
        
        # 1. SE FOI CLICADO EM UMA SALA/GRUPO
        if room_id:
            try:
                room = ChatRoom.objects.get(id=room_id)
                # Regra de negócio do models.py: O usuário pode ler isso?
                if not room.user_has_access(user):
                    raise PermissionDenied("Você não tem acesso a este consultório.")
                
                return Message.objects.filter(room=room).order_by('created_at')
            except ChatRoom.DoesNotExist:
                return Message.objects.none()

        # 2. SE FOI CLICADO EM UM USUÁRIO DIRETAMENTE (P2P)
        elif contact_id:
            # Busca histórico de ida e volta e ordena do mais antigo pro mais novo
            return Message.objects.filter(
                Q(sender=user, receiver_id=contact_id) |
                Q(sender_id=contact_id, receiver=user)
            ).order_by('created_at')
            
        # 3. SE NÃO PASSOU NADA
        return Message.objects.none()


# --- NOVA VIEW PARA LISTAR AS SALAS DO USUÁRIO ---

class UserChatRoomsAPIView(APIView):
    """
    Retorna as salas/grupos que o usuário logado tem permissão para acessar.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        salas = ChatRoom.objects.all()
        # Usa o helper que criamos no models.py para filtrar
        salas_permitidas = [sala for sala in salas if sala.user_has_access(request.user)]
        
        # Formatamos a saída para ser amigável e parecida com a lista de usuários no React
        data = [{
            "id": sala.id,
            "nome_exibicao": sala.name,
            "cargo": "grupo", # Ajudará o Frontend a colocar um ícone diferente (ex: Múltiplas pessoas)
            "is_room": True
        } for sala in salas_permitidas]
        
        return Response(data)