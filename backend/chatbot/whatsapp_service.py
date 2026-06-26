import requests
import logging
from django.conf import settings
from .bot_logic import processar_mensagem_bot
from pacientes.models import Paciente
from crm.models import Ciclo

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
            # Disparo da requisição com timeout de segurança
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            # --- DEBUG PODEROSO: Captura refinada de falhas de envio (ex: bloqueios, anti-spam, 9º dígito) ---
            if not response.ok:
                error_msg = f"\n[ERRO META API] Status: {response.status_code}\n[ERRO META API] Detalhes: {response.text}\n"
                logger.error(error_msg)
                print(error_msg)
                
            response.raise_for_status()
            return response
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Falha de infraestrutura ao enviar mensagem para {self.phone} via Meta: {e}")
            return None
        except Exception as e:
            logger.error(f"Erro de sistema inesperado ao enviar mensagem para {self.phone}: {e}")
            return None

    def processar_fluxo(self, texto):
        """Orquestra o recebimento de mensagens e repassa diretamente ao bot_logic"""
        resultado = processar_mensagem_bot(self.phone, texto)
        return resultado.get("response_message")