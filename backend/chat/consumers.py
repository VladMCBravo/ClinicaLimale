import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Message, ChatRoom, UserPresence

User = get_user_model()
logger = logging.getLogger('chat')

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        print("🔍 SCOPE USER:", self.user, "| anonymous?", self.user.is_anonymous)
        if self.user.is_anonymous:
            await self.close()
            return

        # 1. Entra na sala privada para receber mensagens diretas (P2P)
        self.user_room_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.user_room_name, self.channel_name)
        
        # 2. Entra na sala global para ouvir quem está online
        await self.channel_layer.group_add("global_presence", self.channel_name)

        # 3. NOVO: Inscreve o usuário em todas as salas de consultório que ele tem acesso
        self.room_ids = await self.get_user_rooms(self.user)
        for room_id in self.room_ids:
            await self.channel_layer.group_add(f"room_{room_id}", self.channel_name)

        logger.info(
            f"[CHAT-WS] CONNECT user={self.user.id} ({self.user}) "
            f"grupo_pessoal={self.user_room_name} salas={self.room_ids}"
        )

        await self.accept()
        await self.set_online_status(True)

        # 4. Avisa a todos da clínica que este usuário acabou de entrar
        await self.channel_layer.group_send(
            "global_presence",
            {
                "type": "user_status",
                "user_id": self.user.id,
                "is_online": True
            }
        )

    async def disconnect(self, close_code):
        logger.info(f"[CHAT-WS] DISCONNECT user={getattr(self, 'user', None)} code={close_code}")
        if hasattr(self, 'user_room_name'):
            # 1. Avisa a todos da clínica que este usuário saiu
            await self.channel_layer.group_send(
                "global_presence",
                {
                    "type": "user_status",
                    "user_id": self.user.id,
                    "is_online": False
                }
            )

            # 2. Remove dos grupos básicos
            await self.channel_layer.group_discard(self.user_room_name, self.channel_name)
            await self.channel_layer.group_discard("global_presence", self.channel_name)
            
            # 3. NOVO: Remove dos grupos de consultórios
            if hasattr(self, 'room_ids'):
                for room_id in self.room_ids:
                    await self.channel_layer.group_discard(f"room_{room_id}", self.channel_name)

            await self.set_online_status(False)

    # 1. RECEBE O JSON DO REACT
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        action = data.get('action', 'send_message')

        logger.info(f"[CHAT-WS] RECEIVE user={self.user.id} action={action} payload={data}")

        if action == 'send_message':
            receiver_id = data.get('receiver_id')
            room_id = data.get('room_id')  # <-- NOVO: Pode receber o ID de uma sala
            content = data.get('content', '')
            attachment_type = data.get('attachment_type', 'text')
            attachment_id = data.get('attachment_id')

            # 2. SALVA NO BANCO DE DADOS
            message = await self.save_message(
                sender_id=self.user.id,
                receiver_id=receiver_id,
                room_id=room_id,
                content=content,
                attachment_type=attachment_type,
                attachment_id=attachment_id
            )

            # 3. MONTA O PACOTE DE DISTRIBUIÇÃO
            sender_nome = await self.get_user_first_name(self.user.id)
            message_data = {
                'id': message.id,
                'sender_id': self.user.id,
                'sender_nome': sender_nome, # Adicionado para exibir o nome nos grupos
                'receiver_id': receiver_id,
                'room_id': room_id,         # Adicionado para o React saber de qual sala veio
                'content': message.content,
                'attachment_type': message.attachment_type,
                'attachment_id': message.attachment_id,
                'created_at': message.created_at.isoformat(),
                'is_delivered': message.is_delivered,
                'is_read': message.is_read,
            }

            logger.info(
                f"[CHAT-WS] MSG CRIADA id={message.id} sender={self.user.id} "
                f"receiver_id={receiver_id} room_id={room_id} conteudo={content!r}"
            )

            # 4. ROTEAMENTO: Grupo vs P2P
            if room_id:
                logger.info(f"[CHAT-WS] BROADCAST msg={message.id} -> grupo room_{room_id}")
                # Dispara o Broadcast para TODOS que estão inscritos na sala
                await self.channel_layer.group_send(
                    f"room_{room_id}",
                    {
                        'type': 'chat_message',
                        'message': message_data
                    }
                )
            elif receiver_id:
                logger.info(
                    f"[CHAT-WS] BROADCAST msg={message.id} -> user_{receiver_id} (destinatário) "
                    f"e -> {self.user_room_name} (confirmação p/ remetente)"
                )
                # ENVIA PARA O DESTINATÁRIO (P2P)
                await self.channel_layer.group_send(
                    f"user_{receiver_id}",
                    {
                        'type': 'chat_message',
                        'message': message_data
                    }
                )
                # ENVIA DE VOLTA PARA O REMETENTE (Confirmação)
                await self.channel_layer.group_send(
                    self.user_room_name,
                    {
                        'type': 'chat_message',
                        'message': message_data
                    }
                )
            else:
                logger.warning(
                    f"[CHAT-WS] msg={message.id} NÃO foi roteada: sem room_id e sem receiver_id!"
                )

        elif action == 'update_status':
            message_id = data.get('message_id')
            status = data.get('status')  # Pode ser 'delivered' ou 'read'
            
            # Atualiza no banco e retorna a mensagem atualizada
            updated_message = await self.mark_message_status(message_id, status, self.user)

            logger.info(
                f"[CHAT-WS] UPDATE_STATUS user={self.user.id} message_id={message_id} "
                f"status={status} -> {'OK' if updated_message else 'IGNORADO (permissão ou não existe)'}"
            )

            if updated_message:
                # Se for mensagem de sala, avisa a sala toda que foi lida. Se for P2P, avisa o remetente.
                if updated_message.room_id:
                    await self.channel_layer.group_send(
                        f"room_{updated_message.room_id}",
                        {
                            'type': 'message_status',
                            'message_id': message_id,
                            'status': status,
                            'receiver_id': self.user.id,
                            'room_id': updated_message.room_id
                        }
                    )
                else:
                    await self.channel_layer.group_send(
                        f"user_{updated_message.sender_id}",
                        {
                            'type': 'message_status',
                            'message_id': message_id,
                            'status': status,
                            'receiver_id': self.user.id
                        }
                    )

    # 6. DISPARADOR DE MENSAGEM
    async def chat_message(self, event):
        message_dict = event['message'].copy()
        
        if message_dict['sender_id'] == self.user.id:
            message_dict['sender'] = 'me'
        else:
            message_dict['sender'] = message_dict['sender_id']

        logger.info(
            f"[CHAT-WS] ENVIANDO p/ user={self.user.id} msg_id={message_dict.get('id')} "
            f"sender_id={message_dict.get('sender_id')} room_id={message_dict.get('room_id')} "
            f"sender_calculado={message_dict['sender']}"
        )

        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message_dict
        }))

    # 7. DISPARADOR DE ATUALIZAÇÃO DE STATUS (Tiques)
    async def message_status(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_status',
            'message_id': event['message_id'],
            'status': event['status'],
            'receiver_id': event['receiver_id'],
            'room_id': event.get('room_id') # Adicionado suporte a room_id no React
        }))

    # 4. DISPARADOR QUE ENVIA O JSON DE PRESENCE
    async def user_status(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'user_id': event['user_id'],
            'is_online': event['is_online']
        }))

    # === FUNÇÕES DE BANCO DE DADOS (Assíncronas) ===
    
    @database_sync_to_async
    def get_user_first_name(self, user_id):
        return User.objects.get(id=user_id).first_name

    @database_sync_to_async
    def get_user_rooms(self, user):
        """ Retorna uma lista com os IDs das salas que este usuário tem acesso """
        salas = ChatRoom.objects.all()
        return [sala.id for sala in salas if sala.user_has_access(user)]

    @database_sync_to_async
    def save_message(self, sender_id, receiver_id, room_id, content, attachment_type, attachment_id):
        if room_id:
            room = ChatRoom.objects.get(id=room_id)
            return Message.objects.create(
                sender_id=sender_id,
                room=room,
                content=content,
                attachment_type=attachment_type,
                attachment_id=attachment_id
            )
        else:
            return Message.objects.create(
                sender_id=sender_id,
                receiver_id=receiver_id,
                content=content,
                attachment_type=attachment_type,
                attachment_id=attachment_id
            )

    @database_sync_to_async
    def set_online_status(self, is_online):
        UserPresence.objects.update_or_create(
            user=self.user,
            defaults={'is_online': is_online, 'last_seen': timezone.now()}
        )

    @database_sync_to_async
    def mark_message_status(self, message_id, status, user):
        try:
            msg = Message.objects.get(id=message_id)
            
            # PROTEÇÃO: Só pode marcar como lida se for o recebedor P2P ou se fizer parte do grupo
            if msg.receiver_id and msg.receiver_id != user.id:
                logger.warning(
                    f"[CHAT-WS] mark_message_status NEGADO: msg={message_id} receiver={msg.receiver_id} "
                    f"!= user={user.id}"
                )
                return None
            if msg.room_id and not msg.room.user_has_access(user):
                logger.warning(
                    f"[CHAT-WS] mark_message_status NEGADO: user={user.id} sem acesso à room={msg.room_id}"
                )
                return None

            now = timezone.now()
            
            if status == 'delivered' and not msg.is_delivered:
                msg.is_delivered = True
                msg.delivered_at = now
                msg.save(update_fields=['is_delivered', 'delivered_at'])
            
            elif status == 'read' and not msg.is_read:
                msg.is_read = True
                msg.read_at = now
                msg.is_delivered = True 
                if not msg.delivered_at:
                    msg.delivered_at = now
                msg.save(update_fields=['is_read', 'read_at', 'is_delivered', 'delivered_at'])
                
            return msg
        except Message.DoesNotExist:
            return None