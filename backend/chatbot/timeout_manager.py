# chatbot/timeout_manager.py
from django.utils import timezone
from datetime import timedelta
from .models import ChatMemory
import logging

logger = logging.getLogger(__name__)

class TimeoutManager:
    """Gerencia timeouts e inatividade do chatbot"""
    
    TIMEOUT_MINUTES = 10  # Timeout após 10 minutos de inatividade
    
    @classmethod
    def verificar_timeout(cls, session_id):
        """Verifica se a sessão expirou por inatividade"""
        try:
            memoria = ChatMemory.objects.get(session_id=session_id)
            agora = timezone.now()
            tempo_limite = memoria.updated_at + timedelta(minutes=cls.TIMEOUT_MINUTES)
            
            if agora > tempo_limite and memoria.state != 'awaiting_inactivity_response':
                return cls._iniciar_aviso_timeout(memoria)
            
            return None
            
        except ChatMemory.DoesNotExist:
            return None
    
    @classmethod
    def _iniciar_aviso_timeout(cls, memoria):
        """Inicia o processo de aviso de timeout"""
        memoria.previous_state = memoria.state
        memoria.state = 'awaiting_inactivity_response'
        memoria.save()
        
        nome = memoria.memory_data.get('nome_usuario', '')
        mensagem = (
            f"Olá{f', {nome}' if nome else ''}! 👋\n\n"
            "Notei que ficou um tempo sem responder. "
            "Deseja continuar o atendimento?\n\n"
            "• Digite *Sim* para continuar\n"
            "• Digite *Não* para encerrar"
        )
        
        return {
            "timeout_detected": True,
            "message": mensagem,
            "new_state": "awaiting_inactivity_response"
        }
    
    @classmethod
    def resetar_timeout(cls, session_id):
        """Reseta o timeout quando há atividade"""
        try:
            memoria = ChatMemory.objects.get(session_id=session_id)
            # O campo updated_at é automaticamente atualizado no save()
            memoria.save()
        except ChatMemory.DoesNotExist:
            pass