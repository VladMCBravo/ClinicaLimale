import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatMemory
# Supondo que você terá um serviço para enviar mensagens para o WhatsApp
# from .whatsapp_service import enviar_mensagem_whatsapp 

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'chat_{self.session_id}'

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        logger.info(f"WebSocket conectado para a recepção: {self.session_id}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(f"WebSocket desconectado para a recepção: {self.session_id}")

    # Este método é chamado quando a RECEPCIONISTA digita e envia uma mensagem.
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_from_reception = data['message']
        
        logger.info(f"Recepção enviou para {self.session_id}: '{message_from_reception}'")

        # 1. Marca a conversa como sendo atendida por um humano
        await self.set_conversation_state('humano')
        
        # 2. Envia a mensagem para o WhatsApp do paciente
        # Esta é a parte que você precisará implementar a integração com a API do WhatsApp
        # Por exemplo:
        # await enviar_mensagem_whatsapp(self.session_id, message_from_reception)
        logger.warning(f"SIMULAÇÃO: Enviando '{message_from_reception}' para o WhatsApp do paciente {self.session_id}")
        
        # (Opcional) Você pode querer salvar esta mensagem no banco de dados também.

    # Este método é chamado pelo backend (ex: pela view do WhatsApp)
    # para ENVIAR uma mensagem PARA a tela da recepção.
    async def chat_message(self, event):
        message_payload = event['message'] # Ex: {'text': 'Olá', 'author': 'paciente'}
        
        # Envia a mensagem para o WebSocket (para o frontend React)
        await self.send(text_data=json.dumps({
            'message': message_payload
        }))

    @database_sync_to_async
    def set_conversation_state(self, new_state):
        """Atualiza o estado da conversa no banco de dados."""
        ChatMemory.objects.filter(session_id=self.session_id).update(state=new_state)