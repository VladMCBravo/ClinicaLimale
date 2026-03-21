# chatbot/management/commands/resgatar_leads.py

from django.core.management.base import BaseCommand
from chatbot.recovery_manager import ConversationRecoveryManager
from django.utils import timezone

class Command(BaseCommand):
    help = 'Varre as conversas inativas do chatbot e envia leads abandonados para o CRM.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING(f"[{timezone.now().strftime('%H:%M:%S')}] Iniciando varredura de leads abandonados..."))
        
        try:
            # Aciona a função que já está pronta no seu recovery_manager
            total_resgatados = ConversationRecoveryManager.registrar_abandonos_no_crm()
            
            if total_resgatados > 0:
                self.stdout.write(self.style.SUCCESS(f"✅ Sucesso! {total_resgatados} leads foram enviados ao CRM para resgate."))
            else:
                self.stdout.write(self.style.SUCCESS("Nenhum lead abandonado na janela atual."))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erro ao resgatar leads: {e}"))