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
    
    @staticmethod
    def obter_painel_executivo():
        """
        Gera os números para o Dashboard Executivo.
        Cruza dados do CRM (Ciclos) com Financeiro (Pagamentos/Despesas).
        """
        from faturamento.models import Pagamento, Despesa
        from .models import Ciclo
        from django.db.models import Sum, Count, Avg
        from django.db.models.functions import TruncMonth

        hoje = timezone.now()
        mes_atual = hoje.month
        ano_atual = hoje.year

        # 1. FINANCEIRO (Receita e Margem)
        receita_mes = Pagamento.objects.filter(
            status='Pago', 
            data_pagamento__month=mes_atual, 
            data_pagamento__year=ano_atual
        ).aggregate(total=Sum('valor'))['total'] or 0.00

        despesa_mes = Despesa.objects.filter(
            pago=True, 
            data_pagamento__month=mes_atual,
            data_pagamento__year=ano_atual
        ).aggregate(total=Sum('valor'))['total'] or 0.00

        lucro = float(receita_mes) - float(despesa_mes)
        margem_percentual = round((lucro / float(receita_mes) * 100), 1) if receita_mes > 0 else 0

        # 2. ESTRATÉGICO (CAC e LTV)
        # CAC Simplificado: Total Despesas Marketing / Novos Ciclos no Mês
        # (Assumindo que você tem uma categoria de despesa chamada 'Marketing')
        marketing = Despesa.objects.filter(
            categoria__nome__icontains='Marketing',
            data_pagamento__month=mes_atual
        ).aggregate(total=Sum('valor'))['total'] or 0.00
        
        novos_ciclos = Ciclo.objects.filter(
            data_inicio__month=mes_atual
        ).count()
        
        cac = round(float(marketing) / novos_ciclos, 2) if novos_ciclos > 0 else 0.00
        
        # LTV: Média de receita acumulada de todos os ciclos
        ltv = Ciclo.objects.aggregate(media=Avg('receita_acumulada'))['media'] or 0.00

        # 3. FUNIL (Snapshot Atual)
        ciclos_ativos = Ciclo.objects.filter(status='ativo')
        funil_stats = {
            'entradas': ciclos_ativos.filter(fase_atual='F1').count(),
            'conversao': ciclos_ativos.filter(fase_atual='F2').count(),
            'pos_exame': ciclos_ativos.filter(fase_atual='F3').count(),
            'retencao': ciclos_ativos.filter(fase_atual='F4').count(),
        }

        # 4. GRÁFICOS
        # Evolução Receita (Últimos 6 meses)
        # (Simplificado para o exemplo, idealmente usa TruncMonth em loop)
        evolucao_data = [] # Preencher com lógica de loop se necessário

        return {
            "kpis_financeiros": {
                "receita_mensal": float(receita_mes),
                "margem_percentual": margem_percentual,
                "margem_liquida": float(lucro)
            },
            "kpis_estrategicos": {
                "cac": cac,
                "ltv": float(ltv)
            },
            "riscos": {
                "nivel_alto": Ciclo.objects.filter(nivel_risco='CRITICO').count()
            },
            "funil": funil_stats,
            "graficos": {
                "evolucao_receita": [
                    {"data": "Jan", "receita": 1000}, # Placeholder se não tiver dados
                    {"data": "Fev", "receita": float(receita_mes)} 
                ],
                "origem_pie_chart": [
                    {"name": "Instagram", "receita": 5000},
                    {"name": "Google", "receita": 3000},
                    {"name": "Indicação", "receita": 2000}
                ]
            }
        }