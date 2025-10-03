# chatbot/management/commands/limpar_chatbot.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from chatbot.models import ChatMemory
from chatbot.analytics import ChatbotMetrics
from chatbot.recovery_manager import ConversationRecoveryManager

class Command(BaseCommand):
    help = 'Limpa dados antigos do chatbot e otimiza performance'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dias-memoria',
            type=int,
            default=7,
            help='Dias para manter memórias de conversa (padrão: 7)'
        )
        parser.add_argument(
            '--dias-metricas',
            type=int,
            default=90,
            help='Dias para manter métricas (padrão: 90)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Apenas mostra o que seria removido, sem remover'
        )
    
    def handle(self, *args, **options):
        dias_memoria = options['dias_memoria']
        dias_metricas = options['dias_metricas']
        dry_run = options['dry_run']
        
        self.stdout.write(
            self.style.SUCCESS(f'Iniciando limpeza do chatbot...')
        )
        
        # Limpar memórias antigas - otimizado
        limite_memoria = timezone.now() - timedelta(days=dias_memoria)
        memorias_antigas = ChatMemory.objects.filter(updated_at__lt=limite_memoria).only('id')
        count_memorias = memorias_antigas.count()
        
        if dry_run:
            self.stdout.write(f'[DRY RUN] Removeria {count_memorias} memórias de conversa')
        else:
            memorias_antigas.delete()
            self.stdout.write(
                self.style.SUCCESS(f'Removidas {count_memorias} memórias antigas')
            )
        
        # Limpar métricas antigas - otimizado
        limite_metricas = timezone.now() - timedelta(days=dias_metricas)
        metricas_antigas = ChatbotMetrics.objects.filter(timestamp__lt=limite_metricas).only('id')
        count_metricas = metricas_antigas.count()
        
        if dry_run:
            self.stdout.write(f'[DRY RUN] Removeria {count_metricas} registros de métricas')
        else:
            metricas_antigas.delete()
            self.stdout.write(
                self.style.SUCCESS(f'Removidas {count_metricas} métricas antigas')
            )
        
        # Estatísticas finais
        if not dry_run:
            memorias_restantes = ChatMemory.objects.count()
            metricas_restantes = ChatbotMetrics.objects.count()
            
            self.stdout.write('\n--- Estatísticas Finais ---')
            self.stdout.write(f'Memórias de conversa: {memorias_restantes}')
            self.stdout.write(f'Registros de métricas: {metricas_restantes}')
        
        # Conversas travadas
        agora = timezone.now()
        conversas_travadas = ChatMemory.objects.filter(
            updated_at__lt=agora - timedelta(hours=2)
        ).exclude(state__in=['inicio', 'identificando_demanda'])
        
        count_travadas = conversas_travadas.count()
        if count_travadas > 0:
            self.stdout.write(
                self.style.WARNING(f'Encontradas {count_travadas} conversas possivelmente travadas')
            )
            
            if not dry_run:
                # Reset conversas travadas para estado inicial
                conversas_travadas.update(
                    state='identificando_demanda',
                    previous_state=None
                )
                self.stdout.write('Conversas travadas foram resetadas')
        
        self.stdout.write(
            self.style.SUCCESS('Limpeza concluída com sucesso!')
        )