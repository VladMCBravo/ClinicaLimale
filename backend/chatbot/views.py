from rest_framework.views import APIView
from rest_framework.response import Response
from .whatsapp_service import WhatsAppBotHandler
import logging

logger = logging.getLogger(__name__)

class EvolutionWebhookView(APIView):
    """Endpoint único para receber mensagens da Evolution API"""
    def post(self, request, *args, **kwargs):
        data = request.data
        
        if data.get("event") == "messages.upsert":
            payload = data.get("data", {})
            # Extração segura do texto e número
            msg_obj = payload.get("message", {})
            message_text = msg_obj.get("conversation") or msg_obj.get("extendedTextMessage", {}).get("text", "")
            
            remote_jid = payload.get("key", {}).get("remoteJid", "")
            phone_number = remote_jid.split("@")[0]

            if message_text:
                handler = WhatsAppBotHandler(phone_number)
                resposta = handler.processar_fluxo(message_text)
                handler.enviar_mensagem(resposta)
            
            return Response({"status": "ok"}, status=200)
            
        return Response({"status": "ignored"}, status=200)