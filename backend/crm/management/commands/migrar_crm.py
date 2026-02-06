from django.core.management.base import BaseCommand
import datetime
from django.utils import timezone
from pacientes.models import Paciente
from agendamentos.models import Agendamento
from crm.models import Ciclo
from crm.services import CRMService

class Command(BaseCommand):
    help = 'Migra dados antigos de agendamentos e pagamentos para a nova estrutura de Ciclos do CRM'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("--- INICIANDO MIGRAÇÃO INTELIGENTE DO PASSADO ---"))
        
        # 1. Definir janela de tempo (ex: pacientes ativos nos últimos 4 meses)
        data_corte = timezone.now().date() - datetime.timedelta(days=120)

        # 2. Encontrar pacientes "vivos" no sistema recentemente
        # Filtramos agendamentos recentes
        agendamentos_recentes = Agendamento.objects.filter(data_hora_inicio__gte=data_corte)
        ids_pacientes = agendamentos_recentes.values_list('paciente_id', flat=True).distinct()

        self.stdout.write(f"Encontrados {len(ids_pacientes)} pacientes com atividade recente.")

        criados = 0
        atualizados = 0

        for p_id in ids_pacientes:
            try:
                paciente = Paciente.objects.get(id=p_id)
                
                # Verifica se já tem ciclo ativo (para não duplicar)
                ciclo = Ciclo.objects.filter(paciente=paciente, status='ativo').first()
                
                # Se não existe, CRIA um baseado no histórico
                if not ciclo:
                    # Pega o último agendamento para decidir a fase
                    ultimo_ag = Agendamento.objects.filter(paciente=paciente).order_by('-data_hora_inicio').first()
                    
                    fase_inicial = 'F1'
                    data_inicio_ciclo = timezone.now().date()

                    if ultimo_ag:
                        data_inicio_ciclo = ultimo_ag.data_hora_inicio.date()
                        if ultimo_ag.status == 'Realizado':
                            fase_inicial = 'F3' # Já foi atendido, está em pós-venda
                        elif ultimo_ag.status in ['Agendado', 'Confirmado']:
                            fase_inicial = 'F2' # Está agendado
                    
                    ciclo = Ciclo.objects.create(
                        paciente=paciente,
                        tipo='GESTACAO', # Padrão
                        fase_atual=fase_inicial,
                        status='ativo',
                        data_inicio=data_inicio_ciclo,
                        responsavel=None 
                    )
                    criados += 1
                
                # 3. O PULO DO GATO: Vincular o Passado ao Novo Ciclo
                # Pega todos os agendamentos desse paciente que estão soltos (sem ciclo)
                agendamentos_orfaws = Agendamento.objects.filter(paciente=paciente, ciclo__isnull=True)
                count_ags = agendamentos_orfaws.update(ciclo=ciclo)
                
                # 4. Atualizar o Financeiro (LTV)
                CRMService.atualizar_ltv(ciclo)
                
                if count_ags > 0:
                    atualizados += 1
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Erro ao processar paciente {p_id}: {str(e)}"))

        self.stdout.write(self.style.SUCCESS("---------------------------------------------------"))
        self.stdout.write(self.style.SUCCESS("MIGRAÇÃO CONCLUÍDA!"))
        self.stdout.write(self.style.SUCCESS(f"Novos Ciclos (Funis) criados: {criados}"))
        self.stdout.write(self.style.SUCCESS(f"Pacientes com histórico atualizado: {atualizados}"))
        self.stdout.write(self.style.SUCCESS("Agora seu Kanban e Dashboard devem estar cheios de dados."))