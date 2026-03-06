# chatbot/management/commands/check_inactivity.py
import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from chatbot.models import ChatMemory
from chatbot.whatsapp_service import WhatsAppBotHandler

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Verifica e avisa sessões de chatbot inativas via Evolution API.'

    # Define o tempo de inatividade para enviar a mensagem
    TIMEOUT_WARNING_MINUTES = 15

    def handle(self, *args, **options):
        now = timezone.now()
        self.stdout.write(f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] Iniciando verificação de inatividade...")

        # Apenas avisa. O reset foi removido para o CRM poder atuar!
        self.warn_inactive_sessions(now)

        self.stdout.write(self.style.SUCCESS('Verificação de inatividade concluída.'))

    def warn_inactive_sessions(self, now):
        """Envia aviso para sessões que atingiram o limite de inatividade."""
        warning_start_limit = now - timedelta(minutes=self.TIMEOUT_WARNING_MINUTES + 1)
        warning_end_limit = now - timedelta(minutes=self.TIMEOUT_WARNING_MINUTES)

        # Filtra conversas que pararam no meio do fluxo
        inactive_sessions = ChatMemory.objects.exclude(
            state__in=['inicio', 'awaiting_inactivity_response', 'encerrado']
        ).filter(
            updated_at__gte=warning_start_limit,
            updated_at__lt=warning_end_limit,
            conversa_encerrada=False,
            transferencia_solicitada=False
        ).only('id', 'session_id', 'state')

        if not inactive_sessions.exists():
            self.stdout.write("Nenhuma sessão inativa para avisar.")
            return
            
        count = inactive_sessions.count()
        for session in inactive_sessions:
            session.previous_state = session.state
            session.state = 'awaiting_inactivity_response'
            session.save()

            self.send_proactive_message(
                session.session_id,
                "Olá! Notei que estamos parados há um tempo. Você ainda precisa de ajuda? 😊 (Responda 'sim' para continuar ou 'não' para encerrar)"
            )
        
        self.stdout.write(self.style.SUCCESS(f"{count} sessões inativas foram notificadas."))

    def send_proactive_message(self, session_id, message):
        """Envia uma mensagem diretamente usando o serviço da Evolution API."""
        try:
            # O session_id normalmente é o telefone, garantimos extraindo apenas os números
            telefone = ''.join(filter(str.isdigit, session_id))
            
            # Reutilizamos a sua classe que já funciona perfeitamente com a Evolution
            bot = WhatsAppBotHandler(telefone)
            bot.enviar_mensagem(message)
            
            self.stdout.write(f"Mensagem de inatividade enviada para a sessão {session_id} via Evolution API.")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Falha ao enviar mensagem via Evolution para {session_id}: {e}"))