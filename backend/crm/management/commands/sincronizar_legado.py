from django.core.management.base import BaseCommand
from django.utils import timezone
from prontuario.models import Laudo
from exames.models import Exame
from crm.models import Ciclo
from prontuario.utils import extrair_dum_do_laudo
from datetime import timedelta

class Command(BaseCommand):
    help = 'Sincroniza laudos antigos com Exames e atualiza DUM no CRM'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('--- INICIANDO SINCRONIZAÇÃO DE LEGADO ---'))
        
        # 1. TAREFA: VINCULAR LAUDOS SOLTOS A EXAMES SOLTOS
        self.associar_laudos_exames()
        
        # 2. TAREFA: LER LAUDOS E ATUALIZAR CRM
        self.atualizar_crm_pelos_laudos()
        
        self.stdout.write(self.style.SUCCESS('--- SINCRONIZAÇÃO CONCLUÍDA ---'))

    def associar_laudos_exames(self):
        self.stdout.write('\n1. Buscando laudos sem arquivos vinculados...')
        laudos_sem_exame = Laudo.objects.filter(exame__isnull=True)
        count = 0
        
        for laudo in laudos_sem_exame:
            # Tenta achar um exame do mesmo paciente na mesma data (+- 1 dia de margem)
            data_laudo = laudo.data_criacao.date()
            margem_inicio = data_laudo - timedelta(days=1)
            margem_fim = data_laudo + timedelta(days=1)
            
            exame_candidato = Exame.objects.filter(
                paciente=laudo.paciente,
                data_exame__range=(margem_inicio, margem_fim),
                # Pega um exame que ainda não tenha laudo vinculado (reverso)
                laudo_medico__isnull=True 
            ).first()
            
            if exame_candidato:
                laudo.exame = exame_candidato
                laudo.save()
                self.stdout.write(f"   [VINCULADO] Laudo {laudo.id} -> Exame {exame_candidato.id} ({laudo.paciente})")
                count += 1
        
        self.stdout.write(self.style.SUCCESS(f"   Total de vínculos recuperados: {count}"))

    def atualizar_crm_pelos_laudos(self):
        self.stdout.write('\n2. Lendo inteligência dos laudos para o CRM...')
        
        # Pega laudos obstétricos finalizados
        laudos = Laudo.objects.filter(
            status='FINALIZADO',
            tipo_exame__icontains='OBSTETRICO' # Ajuste conforme seu tipo de exame
        ).select_related('paciente')
        
        atualizados = 0
        
        for laudo in laudos:
            dum_calculada = extrair_dum_do_laudo(laudo)
            
            if dum_calculada:
                # Busca ciclo ativo
                ciclo = Ciclo.objects.filter(
                    paciente=laudo.paciente,
                    tipo='GESTACAO',
                    status='ativo'
                ).first()
                
                if ciclo:
                    # Só atualiza se estiver vazio ou diferente
                    if ciclo.data_dum != dum_calculada:
                        old_dum = ciclo.data_dum
                        ciclo.data_dum = dum_calculada
                        
                        # Atualiza fase se necessário
                        if ciclo.fase_atual in ['F1', 'F2']:
                            ciclo.fase_atual = 'F3'
                        
                        ciclo.save()
                        self.stdout.write(f"   [CRM UPDATE] {laudo.paciente.nome_completo}: DUM {old_dum} -> {dum_calculada}")
                        atualizados += 1
        
        self.stdout.write(self.style.SUCCESS(f"   Ciclos atualizados com DUM: {atualizados}"))