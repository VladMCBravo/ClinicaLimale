import re
import os
import requests
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils.html import escape
from .models import ChatMemory

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            session_id_original = self.scope['url_route']['kwargs']['session_id']

            # --- PONTO DA CORREÇÃO ---
            # Aplica a mesma "limpeza" aqui para garantir consistência
            session_id_sanitizado = re.sub(r'[^a-zA-Z0-9\-_.]', '_', session_id_original)
            # --- FIM DA CORREÇÃO ---

            self.session_id = session_id_original
            self.room_group_name = f'chat_{session_id_sanitizado}' # <-- Usa a versão limpa

            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            logger.info(f"WebSocket conectado para a recepção (Grupo: {self.room_group_name})")
        except Exception as e:
            logger.error(f"Erro ao conectar WebSocket: {e}")
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(f"WebSocket desconectado para a recepção: {self.session_id}")

    # Este método é chamado quando a RECEPCIONISTA digita e envia uma mensagem.
    async def receive(self, text_data):
        try:
            if len(text_data) > 5000:
                await self.send(text_data=json.dumps({'error': 'Mensagem muito longa'}))
                return

            data = json.loads(text_data)
            raw_message = data.get('message', '')

            if not raw_message or len(raw_message) > 1000:
                await self.send(text_data=json.dumps({'error': 'Mensagem inválida'}))
                return

            message_from_reception = escape(raw_message.strip())
            logger.info(f"Recepção enviou para {self.session_id}: '{message_from_reception[:100]}...' ")
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'error': 'JSON inválido'}))
            return
        except Exception as e:
            logger.error(f"Erro ao processar mensagem: {e}")
            await self.send(text_data=json.dumps({'error': 'Erro interno'}))
            return

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
