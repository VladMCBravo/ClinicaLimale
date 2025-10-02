import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

# Importando a lógica de negócio que já existe
from .agendamento_flow import AgendamentoManager
from .models import ChatMemory

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    # Chamado quando o frontend tenta se conectar
    async def connect(self):
        # Extrai o session_id da URL (ex: 'ws/chat/sessa0123/')
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'chat_{self.session_id}'

        # Adiciona o canal (a conexão individual) a um grupo.
        # Isso permite que possamos enviar mensagens para um usuário específico depois.
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Aceita a conexão WebSocket. Se não chamar isso, a conexão é rejeitada.
        await self.accept()
        logger.info(f"WebSocket conectado para a sessão: {self.session_id}")

    # Chamado quando a conexão é fechada
    async def disconnect(self, close_code):
        logger.info(f"WebSocket desconectado para a sessão: {self.session_id}")
        # Remove o canal do grupo
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Chamado quando o backend recebe uma mensagem do frontend
    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        
        logger.info(f"Mensagem recebida de {self.session_id}: {message}")

        # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
        # AQUI ESTÁ A MÁGICA: REUTILIZANDO SUA LÓGICA EXISTENTE!
        # Em vez de reescrever tudo, vamos chamar o mesmo fluxo do chatbot_orchestrator
        # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
        
        # Simula a busca no banco de dados de forma assíncrona
        @database_sync_to_async
        def get_memory_and_process(session_id, user_message):
            memoria_obj, _ = ChatMemory.objects.get_or_create(
                session_id=session_id,
                defaults={'memory_data': {}, 'state': 'inicio'}
            )
            
            estado_atual = memoria_obj.state
            memoria_atual = memoria_obj.memory_data

            # Inicializa o manager (sem as chains de IA por enquanto, para simplificar)
            manager = AgendamentoManager(session_id, memoria_atual, "")
            resultado = manager.processar(user_message, estado_atual)
            
            # Salva o novo estado
            memoria_obj.state = resultado.get("new_state")
            memoria_obj.memory_data = resultado.get("memory_data")
            memoria_obj.save()

            return resultado.get("response_message")

        # Chama a função de processamento
        response_message = await get_memory_and_process(self.session_id, message)
        
        # Envia a resposta do chatbot de volta para o frontend através do grupo
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': response_message
            }
        )

    # Método auxiliar para enviar a mensagem ao WebSocket
    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'message': message
        }))

# Adicione esta importação no topo do arquivo consumers.py
from channels.db import database_sync_to_async