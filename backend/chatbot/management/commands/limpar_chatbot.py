# chatbot/management/commands/limpar_chatbot.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from chatbot.models import ChatMemory
from chatbot.models import ChatbotMetrics # Ajustei o import que estava apontando para analytics
from chatbot.recovery_manager import ConversationRecoveryManager

class Command(BaseCommand):
    help = 'Limpa dados antigos do chatbot e envia leads abandonados para o CRM'
    
    def add_arguments(self, parser):
        parser.add_argument('--dias-memoria', type=int, default=7, help='Dias para manter memórias de conversa (padrão: 7)')
        parser.add_argument('--dias-metricas', type=int, default=90, help='Dias para manter métricas (padrão: 90)')
        parser.add_argument('--dry-run', action='store_true', help='Apenas mostra o que seria removido, sem remover')
    
    def handle(self, *args, **options):
        dias_memoria = options['dias_memoria']
        dias_metricas = options['dias_metricas']
        dry_run = options['dry_run']
        
        self.stdout.write(self.style.SUCCESS(f'Iniciando rotina de manutenção do Chatbot...'))
        
        # ==========================================
        # 1. LIMPEZA DE BANCO DE DADOS (Manutenção)
        # ==========================================
        limite_memoria = timezone.now() - timedelta(days=dias_memoria)
        memorias_antigas = ChatMemory.objects.filter(updated_at__lt=limite_memoria).only('id')
        count_memorias = memorias_antigas.count()
        
        if dry_run:
            self.stdout.write(f'[DRY RUN] Removeria {count_memorias} memórias de conversa')
        else:
            memorias_antigas.delete()
            self.stdout.write(self.style.SUCCESS(f'Removidas {count_memorias} memórias antigas'))
        
        limite_metricas = timezone.now() - timedelta(days=dias_metricas)
        metricas_antigas = ChatbotMetrics.objects.filter(timestamp__lt=limite_metricas).only('id')
        count_metricas = metricas_antigas.count()
        
        if dry_run:
            self.stdout.write(f'[DRY RUN] Removeria {count_metricas} registros de métricas')
        else:
            metricas_antigas.delete()
            self.stdout.write(self.style.SUCCESS(f'Removidas {count_metricas} métricas antigas'))
        
        # ==========================================
        # 2. MÁQUINA COMERCIAL: RESGATE DE LEADS (CRM)
        # ==========================================
        self.stdout.write('\n--- Iniciando Resgate Comercial (CRM) ---')
        
        if dry_run:
            self.stdout.write('[DRY RUN] A varredura do CRM não será executada no modo dry-run.')
        else:
            self.stdout.write('Buscando pacientes que pararam de responder nas últimas horas...')
            # Chama o caçador que criamos no passo anterior
            quantidade_resgatada = ConversationRecoveryManager.registrar_abandonos_no_crm()
            
            if quantidade_resgatada > 0:
                self.stdout.write(self.style.SUCCESS(f'🔥 Golaço! {quantidade_resgatada} leads esfriaram no bot e foram enviados para a equipe de vendas (F5).'))
            else:
                self.stdout.write('Nenhum lead abandonado pendente de resgate no momento.')

        # Estatísticas finais
        if not dry_run:
            self.stdout.write('\n--- Estatísticas Finais ---')
            self.stdout.write(f'Memórias ativas no banco: {ChatMemory.objects.count()}')
            self.stdout.write(f'Métricas retidas: {ChatbotMetrics.objects.count()}')
            
        self.stdout.write(self.style.SUCCESS('\nRotina concluída com sucesso!'))