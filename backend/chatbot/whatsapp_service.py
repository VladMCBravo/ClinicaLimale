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
        # Remove caracteres não numéricos para buscar no banco
        self.clean_phone = ''.join(filter(str.isdigit, phone))
        self.paciente, _ = Paciente.objects.get_or_create(telefone_celular=self.clean_phone)
        # Busca se existe um ciclo de qualquer tipo aberto para este paciente
        self.ciclo_ativo = Ciclo.objects.filter(paciente=self.paciente, status='ativo').first()

    def enviar_mensagem(self, texto):
        """Envia a resposta via Evolution API"""
        if not texto:
            return
            
        url = f"{settings.EVOLUTION_API_URL}/message/sendText/{settings.EVOLUTION_INSTANCE}"
        payload = {
            "number": self.phone, 
            "textMessage": {"text": texto}
        }
        headers = {"apikey": settings.EVOLUTION_API_KEY}
        
        try:
            # verify=False contorna o erro [SSL: TLSV1_UNRECOGNIZED_NAME] visto nos testes
            response = requests.post(url, json=payload, headers=headers, verify=False, timeout=10)
            response.raise_for_status()
            return response
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem para {self.phone}: {e}")
            return None

    def processar_fluxo(self, texto):
        """Orquestra entre acolhimento de Pré-Natal ou Agendamento Geral"""
        msg_lower = texto.lower()
        
        # Identifica interesse em gestação para abrir o Ciclo automaticamente
        palavras_prenatal = ['grávida', 'gravida', 'gestante', 'pré-natal', 'pre-natal', 'dum']
        if not self.ciclo_ativo and any(p in msg_lower for p in palavras_prenatal):
            return self.iniciar_acolhimento_gestante()

        # Para todos os outros casos (FAQ, Agendamento, Preço), usa a lógica da IA
        resultado = processar_mensagem_bot(self.phone, texto)
        return resultado.get("response_message")

    def iniciar_acolhimento_gestante(self):
        """Cria o ciclo de GESTACAO e move para Fase F1"""
        Ciclo.objects.create(
            paciente=self.paciente, 
            tipo='GESTACAO', 
            fase_atual='F1', 
            status='ativo'
        )
        return (
            "Parabéns por esse momento especial! 🌸 Sou o assistente da Clínica Limale.\n\n"
            "Identifiquei seu interesse em nosso Pré-Natal. Para começarmos seu acompanhamento, "
            "qual foi a data da sua última menstruação (DUM)?"
        )