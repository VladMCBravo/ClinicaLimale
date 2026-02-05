# backend/crm/services.py

from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import timedelta

# Imports de Models
from .models import Ciclo, ProximaAcao
# Usamos apps.get_model para evitar qualquer risco de erro de importação circular
from django.apps import apps

class CRMService:

    @staticmethod
    def mover_fase(ciclo_id, nova_fase, usuario_responsavel):
        """
        Move o card e dispara automações (ex: criar tarefa se faltar agendamento).
        """
        ciclo = Ciclo.objects.get(id=ciclo_id)
        fase_anterior = ciclo.fase_atual
        
        ciclo.fase_atual = nova_fase
        ciclo.save()
        
        # --- AUTOMAÇÃO: ALERTA DE QUEDA ---
        # Se moveu para F2 (Conversão), mas não tem agendamento futuro, cria alerta.
        if nova_fase == 'F2':
            Agendamento = apps.get_model('agendamentos', 'Agendamento')
            
            tem_agendamento_futuro = Agendamento.objects.filter(
                ciclo=ciclo, # <--- Usa seu novo campo!
                status__in=['Agendado', 'Confirmado'],
                data_hora_inicio__gte=timezone.now()
            ).exists()
            
            if not tem_agendamento_futuro:
                CRMService.criar_acao(
                    ciclo=ciclo,
                    descricao="⚠️ Paciente em F2 sem agendamento futuro. Ligar urgente!",
                    data_alvo=timezone.now().date(),
                    responsavel=usuario_responsavel
                )

        return ciclo

    @staticmethod
    def atualizar_ltv(ciclo):
        """
        Recalcula a receita total DESTE ciclo somando os pagamentos.
        """
        Pagamento = apps.get_model('faturamento', 'Pagamento')
        
        # Soma todos os pagamentos (PAGOS) vinculados aos agendamentos deste ciclo
        total = Pagamento.objects.filter(
            agendamento__ciclo=ciclo, # <--- A mágica acontece aqui
            status='Pago'
        ).aggregate(total=Sum('valor'))['total'] or 0.00
        
        ciclo.receita_acumulada = total
        ciclo.save()
        return total

    @staticmethod
    def criar_acao(ciclo, descricao, data_alvo, responsavel=None):
        return ProximaAcao.objects.create(
            ciclo=ciclo,
            descricao=descricao,
            data_alvo=data_alvo,
            responsavel=responsavel or ciclo.responsavel,
            status='PENDENTE'
        )

    @staticmethod
    def processar_gatilho_agendamento(agendamento, criado=False):
        """
        Automação: O Agendamento empurra o Card no Kanban.
        """
        if not agendamento.ciclo:
            return

        ciclo = agendamento.ciclo
        
        # Regra 1: Confirmou Agendamento? Vai para F2 (se estiver em F1)
        if agendamento.status == 'Confirmado' and ciclo.fase_atual == 'F1':
            ciclo.fase_atual = 'F2'
            ciclo.save()
            print(f"[CRM] Ciclo {ciclo.id} movido para F2 via Agendamento {agendamento.id}")
        
        # Regra 2: Realizou o Exame? Vai para F3 (Pós-Exame/Retenção)
        if agendamento.status == 'Realizado' and ciclo.fase_atual in ['F1', 'F2']:
            ciclo.fase_atual = 'F3'
            ciclo.save()
            
            # Cria tarefa de Follow-up pós-exame para 2 dias depois
            CRMService.criar_acao(
                ciclo=ciclo,
                descricao="Pós-venda: Ligar para saber se gostou do atendimento",
                data_alvo=timezone.now().date() + timedelta(days=2)
            )
            print(f"[CRM] Ciclo {ciclo.id} movido para F3 e tarefa criada.")

    @staticmethod
    def obter_dados_kanban(usuario_filtro=None):
        """
        Retorna os dados já agrupados para o Frontend.
        """
        # Importação local para evitar circular se views chamar services
        from .serializers import CicloKanbanSerializer
        
        queryset = Ciclo.objects.filter(status='ativo').select_related('paciente').order_by('-data_inicio')
        
        if usuario_filtro:
            queryset = queryset.filter(responsavel=usuario_filtro)
            
        serializer = CicloKanbanSerializer(queryset, many=True)
        data = serializer.data
        
        kanban_data = { "F1": [], "F2": [], "F3": [], "F4": [], "ENCERRADO": [] }
        
        for item in data:
            fase = item.get('fase_atual', 'F1')
            if fase in kanban_data:
                kanban_data[fase].append(item)
            else:
                kanban_data.setdefault(fase, []).append(item)
                
        return kanban_data