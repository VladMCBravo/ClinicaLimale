import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import UserPresence, Message

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        print("🔍 SCOPE USER:", self.user, "| anonymous?", self.user.is_anonymous)
        if self.user.is_anonymous:
            await self.close()
            return

        # 1. Entra na sala privada para receber mensagens diretas
        self.user_room_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.user_room_name, self.channel_name)
        
        # 2. NOVO: Entra na sala global para ouvir quem está online
        await self.channel_layer.group_add("global_presence", self.channel_name)

        await self.accept()
        await self.set_online_status(True)

        # 3. NOVO: Avisa a todos da clínica que este usuário acabou de entrar
        await self.channel_layer.group_send(
            "global_presence",
            {
                "type": "user_status",
                "user_id": self.user.id,
                "is_online": True
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'user_room_name'):
            # 1. NOVO: Avisa a todos da clínica que este usuário saiu
            await self.channel_layer.group_send(
                "global_presence",
                {
                    "type": "user_status",
                    "user_id": self.user.id,
                    "is_online": False
                }
            )

            # 2. Remove dos grupos
            await self.channel_layer.group_discard(self.user_room_name, self.channel_name)
            await self.channel_layer.group_discard("global_presence", self.channel_name)
            await self.set_online_status(False)

    # 1. RECEBE O JSON DO REACT
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        # Adicionamos um 'action' para saber o que o React quer fazer. O padrão é enviar mensagem.
        action = data.get('action', 'send_message')

        if action == 'send_message':
            receiver_id = data.get('receiver_id')
            content = data.get('content', '')
            attachment_type = data.get('attachment_type', 'text')
            attachment_id = data.get('attachment_id')

            # 2. SALVA NO BANCO DE DADOS
            message = await self.save_message(
                sender_id=self.user.id,
                receiver_id=receiver_id,
                content=content,
                attachment_type=attachment_type,
                attachment_id=attachment_id
            )

            # 3. MONTA O PACOTE DE DISTRIBUIÇÃO
            message_data = {
                'id': message.id,
                'sender_id': self.user.id,
                'receiver_id': receiver_id,
                'content': message.content,
                'attachment_type': message.attachment_type,
                'attachment_id': message.attachment_id,
                'created_at': message.created_at.isoformat(),
                'is_delivered': message.is_delivered,
                'is_read': message.is_read,
            }

            # 4. ENVIA PARA O DESTINATÁRIO
            await self.channel_layer.group_send(
                f"user_{receiver_id}",
                {
                    'type': 'chat_message',
                    'message': message_data
                }
            )

            # 5. ENVIA DE VOLTA PARA O REMETENTE (Confirmação)
            await self.channel_layer.group_send(
                self.user_room_name,
                {
                    'type': 'chat_message',
                    'message': message_data
                }
            )

        elif action == 'update_status':
            message_id = data.get('message_id')
            status = data.get('status')  # Pode ser 'delivered' ou 'read'
            
            # Atualiza no banco e retorna a mensagem atualizada
            updated_message = await self.mark_message_status(message_id, status, self.user.id)
            
            if updated_message:
                # Avisa o REMETENTE original que a mensagem dele foi entregue ou lida (para mudar a cor dos tiques)
                await self.channel_layer.group_send(
                    f"user_{updated_message.sender_id}",
                    {
                        'type': 'message_status',
                        'message_id': message_id,
                        'status': status,
                        'receiver_id': self.user.id
                    }
                )

    # 6. DISPARADOR DE MENSAGEM (Mantenha o seu original, apenas garantindo que is_read vem junto)
    async def chat_message(self, event):
        message_dict = event['message'].copy()
        
        if message_dict['sender_id'] == self.user.id:
            message_dict['sender'] = 'me'
        else:
            message_dict['sender'] = message_dict['sender_id']

        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message_dict
        }))

    # 7. NOVO: DISPARADOR DE ATUALIZAÇÃO DE STATUS (Tiques)
    async def message_status(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_status',
            'message_id': event['message_id'],
            'status': event['status'],
            'receiver_id': event['receiver_id']
        }))

    # 4. NOVO: O disparador que envia o JSON de status para o React
    async def user_status(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'user_id': event['user_id'],
            'is_online': event['is_online']
        }))

    # === FUNÇÕES DE BANCO DE DADOS (Assíncronas) ===
    
    @database_sync_to_async
    def save_message(self, sender_id, receiver_id, content, attachment_type, attachment_id):
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

    # 8. NOVO: ATUALIZA NO BANCO DE DADOS ASSINCRONAMENTE
    @database_sync_to_async
    def mark_message_status(self, message_id, status, user_id):
        try:
            # Filtra por receiver_id para garantir que apenas o destinatário pode marcar como lida
            msg = Message.objects.get(id=message_id, receiver_id=user_id)
            now = timezone.now()
            
            if status == 'delivered' and not msg.is_delivered:
                msg.is_delivered = True
                msg.delivered_at = now
                msg.save(update_fields=['is_delivered', 'delivered_at'])
            
            elif status == 'read' and not msg.is_read:
                # Se foi lida, automaticamente também foi entregue
                msg.is_read = True
                msg.read_at = now
                msg.is_delivered = True 
                if not msg.delivered_at:
                    msg.delivered_at = now
                msg.save(update_fields=['is_read', 'read_at', 'is_delivered', 'delivered_at'])
                
            return msg
        except Message.DoesNotExist:
            return None