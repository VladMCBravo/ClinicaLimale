# chatbot/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_api_key.permissions import HasAPIKey
from .models import ChatMemory

class ChatMemoryView(APIView):
    """
    View para buscar (GET) e salvar (POST) a memória da conversa do chatbot.
    Protegida por API Key.
    """
    permission_classes = [HasAPIKey]

    def get(self, request, session_id):
        """
        Busca a memória da conversa para um determinado session_id.
        """
        try:
            chat = ChatMemory.objects.get(session_id=session_id)
            # O N8N espera um objeto com a chave "memoryData"
            return Response({'memoryData': chat.memory_data})
        except ChatMemory.DoesNotExist:
            # Se não existir, retorna uma memória vazia, como o N8N espera
            return Response({'memoryData': []})

    def post(self, request):
        """
        Cria ou atualiza a memória da conversa.
        """
        session_id = request.data.get('sessionId')
        memory_data = request.data.get('memoryData')

        if not session_id or memory_data is None:
            return Response(
                {'error': 'sessionId e memoryData são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # update_or_create é perfeito: atualiza se existir, cria se não existir.
        obj, created = ChatMemory.objects.update_or_create(
            session_id=session_id,
            defaults={'memory_data': memory_data}
        )

        return Response(
            {'status': 'Memória salva com sucesso'},
            status=status.HTTP_200_OK
        )