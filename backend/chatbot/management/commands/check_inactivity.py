# chatbot/management/commands/check_inactivity.py
import os
import requests
import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from chatbot.models import ChatMemory

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Verifica e gerencia sessões de chatbot inativas.'

    # Define os tempos em minutos
    TIMEOUT_WARNING_MINUTES = 15
    TIMEOUT_RESET_MINUTES = 2 # Tempo para responder à mensagem de aviso

    def handle(self, *args, **options):
        now = timezone.now()
        self.stdout.write(f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] Iniciando verificação de inatividade...")

        self.reset_expired_sessions(now)
        self.warn_inactive_sessions(now)

        self.stdout.write(self.style.SUCCESS('Verificação de inatividade concluída.'))

    def reset_expired_sessions(self, now):
        """Reseta sessões que não responderam ao aviso de inatividade."""
        reset_limit = now - timedelta(minutes=self.TIMEOUT_RESET_MINUTES)
        
        expired_sessions = ChatMemory.objects.filter(
            state='awaiting_inactivity_response',
            updated_at__lt=reset_limit
        ).only('id', 'session_id', 'memory_data')

        if not expired_sessions.exists():
            self.stdout.write("Nenhuma sessão expirada para resetar.")
            return

        count = expired_sessions.count()
        for session in expired_sessions:
            session.state = 'inicio'
            user_name = session.memory_data.get('nome_usuario')
            session.memory_data = {'nome_usuario': user_name} if user_name else {}
            session.previous_state = None
            session.save()
            
            self.send_proactive_message(
                session.session_id,
                "Como não recebi uma resposta, estou encerrando nossa conversa por enquanto. Se precisar de algo, é só me chamar! 😉"
            )

        self.stdout.write(self.style.WARNING(f"{count} sessões expiradas foram resetadas."))

    def warn_inactive_sessions(self, now):
        """Envia aviso para sessões que atingiram o limite de inatividade."""
        warning_start_limit = now - timedelta(minutes=self.TIMEOUT_WARNING_MINUTES + 1)
        warning_end_limit = now - timedelta(minutes=self.TIMEOUT_WARNING_MINUTES)

        inactive_sessions = ChatMemory.objects.exclude(
            state__in=['inicio', 'awaiting_inactivity_response']
        ).filter(
            updated_at__gte=warning_start_limit,
            updated_at__lt=warning_end_limit
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
        """Envia uma mensagem para o N8N, que a repassará para o usuário."""
        webhook_url = getattr(settings, 'N8N_PROACTIVE_WEBHOOK_URL', None)
        if not webhook_url:
            self.stdout.write(self.style.ERROR("A variável N8N_PROACTIVE_WEBHOOK_URL não está configurada!"))
            return

        payload = {
            "sessionId": session_id,
            "message": message
        }
        
        try:
            response = requests.post(webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            self.stdout.write(f"Mensagem de inatividade enviada para a sessão {session_id}.")
        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f"Falha ao enviar mensagem para a sessão {session_id}: {e}"))
