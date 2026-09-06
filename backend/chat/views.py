import logging
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q

from .models import Message, ChatRoom
from .serializers import MessageSerializer

logger = logging.getLogger('chat')

class ChatHistoryAPIView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        contact_id = self.request.query_params.get('contact_id')
        room_id = self.request.query_params.get('room_id')  # <-- NOVO PARÂMETRO

        logger.info(f"[CHAT-HIST] GET /chat/history/ user={user.id} ({user}) room_id={room_id} contact_id={contact_id}")

        # 1. SE FOI CLICADO EM UMA SALA/GRUPO
        if room_id:
            try:
                room = ChatRoom.objects.get(id=room_id)
                # Regra de negócio do models.py: O usuário pode ler isso?
                if not room.user_has_access(user):
                    logger.warning(f"[CHAT-HIST] user={user.id} SEM ACESSO à room={room_id} ({room.name})")
                    raise PermissionDenied("Você não tem acesso a este consultório.")

                qs = Message.objects.filter(room=room).order_by('created_at')
                logger.info(f"[CHAT-HIST] room={room_id} ({room.name}) -> {qs.count()} mensagens retornadas")
                return qs
            except ChatRoom.DoesNotExist:
                logger.warning(f"[CHAT-HIST] room_id={room_id} não existe no banco")
                return Message.objects.none()

        # 2. SE FOI CLICADO EM UM USUÁRIO DIRETAMENTE (P2P)
        elif contact_id:
            # Busca histórico de ida e volta e ordena do mais antigo pro mais novo
            qs = Message.objects.filter(
                Q(sender=user, receiver_id=contact_id) |
                Q(sender_id=contact_id, receiver=user)
            ).order_by('created_at')
            logger.info(f"[CHAT-HIST] P2P user={user.id} <-> contact={contact_id} -> {qs.count()} mensagens retornadas")
            return qs

        # 3. SE NÃO PASSOU NADA
        logger.warning(f"[CHAT-HIST] user={user.id} chamou /history/ sem room_id nem contact_id")
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

        logger.info(
            f"[CHAT-ROOMS] user={request.user.id} ({request.user}) tem acesso a "
            f"{len(salas_permitidas)}/{salas.count()} salas: "
            f"{[s.id for s in salas_permitidas]}"
        )

        # Formatamos a saída para ser amigável e parecida com a lista de usuários no React
        data = [{
            "id": sala.id,
            "nome_exibicao": sala.name,
            "cargo": "grupo", # Ajudará o Frontend a colocar um ícone diferente (ex: Múltiplas pessoas)
            "is_room": True
        } for sala in salas_permitidas]
        
        return Response(data)