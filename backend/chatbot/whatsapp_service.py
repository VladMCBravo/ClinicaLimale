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
        """Envia a resposta via Evolution API"""
        if not texto:
            return
            
        url = f"{settings.EVOLUTION_API_URL}/message/sendText/{settings.EVOLUTION_INSTANCE}"
        
        # --- MUDANÇA AQUI: Formato atualizado para Evolution API V2 ---
        payload = {
            "number": self.phone, 
            "text": texto  # Antes estava "textMessage": {"text": texto}
        }
        
        headers = {
            "apikey": settings.EVOLUTION_API_KEY,
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, verify=False, timeout=10)
            
            # --- DEBUG PODEROSO: Se der erro, printa a fofoca toda ---
            if not response.ok:
                print(f"\n[ERRO EVOLUTION] Status: {response.status_code}")
                print(f"[ERRO EVOLUTION] Detalhes: {response.text}\n")
                
            response.raise_for_status()
            return response
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem para {self.phone}: {e}")
            return None

    def processar_fluxo(self, texto):
        """Orquestra o recebimento de mensagens e repassa diretamente ao bot_logic"""
        resultado = processar_mensagem_bot(self.phone, texto)
        return resultado.get("response_message")

