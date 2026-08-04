import requests
import logging
from django.conf import settings
from .bot_logic import processar_mensagem_bot
from pacientes.models import Paciente
from crm.models import Ciclo
from django.utils import timezone
from datetime import timedelta
from .services import enviar_msg_whatsapp, enviar_template_whatsapp
from .models import ChatMemory


logger = logging.getLogger(__name__)

class WhatsAppBotHandler:
    def __init__(self, phone):
        self.phone = phone
        self.clean_phone = ''.join(filter(str.isdigit, phone))
        
        # AGORA É SÓ BUSCA: Ele apenas PROCURA. Se não achar, paciente fica None.
        self.paciente = Paciente.objects.filter(telefone_celular=self.clean_phone).first()
        
        # Só busca o ciclo se o paciente existir
        if self.paciente:
            self.ciclo_ativo = Ciclo.objects.filter(paciente=self.paciente, status='ativo').first()
        else:
            self.ciclo_ativo = None

    def janela_24h_aberta(self):
        """Verifica se ainda estamos dentro da janela de atendimento de 24h."""
        try:
            memoria = ChatMemory.objects.get(session_id=self.phone)
        except ChatMemory.DoesNotExist:
            return False
        return (timezone.now() - memoria.updated_at) < timedelta(hours=24)

    def enviar_template(self, nome_template, parametros=None, idioma="pt_BR", formato="positional"):
        """Envia template — usado para lembretes/reengajamento fora da janela de 24h."""
        return enviar_template_whatsapp(
            self.phone, nome_template, idioma=idioma, parametros=parametros, formato=formato
        )

    def enviar_mensagem(self, texto):
        """Envia a resposta via API Oficial da Meta (WhatsApp Cloud API)"""
        if not texto:
            return
            
        # As variáveis abaixo precisarão ser adicionadas no seu settings.py e arquivo .env
        api_version = getattr(settings, 'META_API_VERSION', 'v25.0')
        phone_number_id = settings.META_PHONE_NUMBER_ID
        access_token = settings.META_ACCESS_TOKEN
        
        # URL oficial de disparo da Graph API
        url = f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages"
        
        # Estrutura de Payload exigida pela Meta para mensagens de texto
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": self.phone,
            "type": "text",
            "text": {
                "preview_url": False, # Define se o WhatsApp deve renderizar links
                "body": texto
            }
        }
        
        # Cabeçalho com o Token Permanente gerado no painel da Meta
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if not response.ok:
                error_msg = f"\n[💥 ERRO FATAL META API] Status: {response.status_code}\n[💥 ERRO FATAL META API] Destinatário: {self.phone}\n[💥 ERRO FATAL META API] Detalhes: {response.text}\n"
                logger.error(error_msg)
                print(error_msg) # Força a impressão no console do Render
                
            response.raise_for_status()
            return response
            
        except Exception as e:
            error_trace = f"\n[💥 ERRO DE SISTEMA] Falha ao enviar para {self.phone}: {e}\n"
            logger.error(error_trace)
            print(error_trace) # Força a impressão no console do Render
            return None

    def processar_fluxo(self, texto):
        """Orquestra o recebimento de mensagens e repassa diretamente ao bot_logic"""
        resultado = processar_mensagem_bot(self.phone, texto)
        return resultado.get("response_message")