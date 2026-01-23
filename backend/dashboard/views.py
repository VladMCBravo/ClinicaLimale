# backend/dashboard/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Count, F, Q
from datetime import timedelta

# Importação dos Models de todos os apps
from crm.models import Ciclo
from faturamento.models import Pagamento, Despesa
from agendamentos.models import Agendamento
from .models import MetaMensal, SnapshotDiario

class PainelExecutivoView(APIView):
    """
    API Central do Dashboard Limalé.
    Retorna: KPIs Financeiros, CAC, LTV, Status do Funil e Riscos.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoje = timezone.now().date()
        inicio_mes = hoje.replace(day=1)
        
        # --- 1. BUSCAR METAS E INVESTIMENTO (DO MÊS ATUAL) ---
        try:
            meta_obj = MetaMensal.objects.get(mes_referencia=inicio_mes)
            investimento_mkt = meta_obj.investimento_marketing
            custo_fixo = meta_obj.custos_fixos_estimados
            meta_faturamento = meta_obj.meta_faturamento
            meta_novos_ciclos = meta_obj.meta_novos_ciclos
        except MetaMensal.DoesNotExist:
            # Valores padrão para não quebrar o dashboard se não houver meta cadastrada
            meta_obj = None
            investimento_mkt = 0
            custo_fixo = 0
            meta_faturamento = 1 # Evita divisão por zero
            meta_novos_ciclos = 1

        # --- 2. DADOS FINANCEIROS (REALIZADO) ---
        # Receita: Soma de pagamentos 'Pagos' neste mês
        receita_real = Pagamento.objects.filter(
            data_pagamento__gte=inicio_mes, 
            status='Pago'
        ).aggregate(total=Sum('valor'))['total'] or 0

        # Custos Totais: Despesas Variáveis do mês + Custo Fixo (da Meta)
        despesas_variaveis = Despesa.objects.filter(
            data_despesa__gte=inicio_mes
        ).aggregate(total=Sum('valor'))['total'] or 0
        
        custo_total = float(custo_fixo) + float(despesas_variaveis)
        margem_liquida = float(receita_real) - custo_total
        margem_percentual = (margem_liquida / float(receita_real) * 100) if receita_real > 0 else 0

        # Ticket Médio: Receita / Qtd de Pagamentos (ou Agendamentos Pagos)
        qtd_pagamentos = Pagamento.objects.filter(data_pagamento__gte=inicio_mes, status='Pago').count()
        ticket_medio = (float(receita_real) / qtd_pagamentos) if qtd_pagamentos > 0 else 0

        # --- 3. DADOS DE CRM E CICLOS (CORE LIMALÉ) ---
        
        # Novos Ciclos (Entradas) neste mês
        novos_ciclos_count = Ciclo.objects.filter(data_inicio__gte=inicio_mes).count()
        
        # Cálculo de CAC (Custo de Aquisição de Cliente)
        # CAC = Investimento Mkt / Novos Ciclos
        cac = (float(investimento_mkt) / novos_ciclos_count) if novos_ciclos_count > 0 else 0

        # LTV (Lifetime Value) Simplificado para o Dashboard
        # Média de receita acumulada dos ciclos ativos ou encerrados recentemente
        ltv_medio = Ciclo.objects.aggregate(media=Sum('receita_acumulada') / Count('id'))['media'] or 0

        # Funil Atual (Snapshot do momento)
        # Conta quantos ciclos estão em cada fase AGORA
        funil_status = Ciclo.objects.filter(status='ativo').values('fase_atual').annotate(total=Count('id'))
        funil_dict = {item['fase_atual']: item['total'] for item in funil_status}
        
        # Dados para o Gráfico de Funil
        funil_data = {
            "F1": funil_dict.get('F1', 0),
            "F2": funil_dict.get('F2', 0),
            "F3": funil_dict.get('F3', 0),
            "F4": funil_dict.get('F4', 0),
        }

        # --- 4. GESTÃO DE RISCOS (ALERTAS) ---
        # Filtra ciclos com risco ALERTA ou CRITICO
        risco_alto_count = Ciclo.objects.filter(status='ativo', nivel_risco='CRITICO').count()
        risco_medio_count = Ciclo.objects.filter(status='ativo', nivel_risco='ALERTA').count()
        
        # Taxa de Evasão (Exemplo simples: Ciclos encerrados sem sucesso / Total encerrados)
        # Aqui vamos simular com base nos riscos para o painel visual
        taxa_risco = (risco_alto_count / (novos_ciclos_count + 1)) * 100 # +1 evita div zero

        # --- 5. ORIGEM VENCEDORA (MARKETING) ---
        # Agrupa ciclos por origem para saber qual canal traz mais gente
        # Requer que o campo 'origem' exista no Ciclo ou seja buscado via Paciente
        # Aqui assumo que você adicionou o campo 'origem' no Ciclo conforme sugerido anteriormente
        origem_stats = Ciclo.objects.filter(data_inicio__gte=inicio_mes)\
            .values('origem')\
            .annotate(total=Count('id'), receita=Sum('receita_acumulada'))\
            .order_by('-receita')
        
        origem_vencedora = origem_stats[0]['origem'] if origem_stats else "N/A"

        # --- 6. GRÁFICO DE EVOLUÇÃO (SNAPSHOTS) ---
        # Pega os últimos 30 dias de histórico salvo
        snapshots = SnapshotDiario.objects.all().order_by('data')[:30]
        grafico_evolucao = [
            {
                "data": s.data.strftime("%d/%m"),
                "receita": s.receita_do_dia,
                "agendados": s.total_agendados
            } 
            for s in snapshots
        ]

        # --- MONTAR O JSON FINAL ---
        data = {
            "kpis_financeiros": {
                "receita_mensal": receita_real,
                "custos_totais": custo_total,
                "margem_liquida": margem_liquida,
                "margem_percentual": round(margem_percentual, 1),
                "ticket_medio": round(ticket_medio, 2),
                "projecao_receita": float(receita_real) * 1.2 # Exemplo de projeção simples
            },
            "kpis_estrategicos": {
                "cac": round(cac, 2),
                "ltv": round(ltv_medio, 2),
                "investimento_marketing": investimento_mkt,
                "meta_faturamento": meta_faturamento,
                "progresso_meta": (float(receita_real) / float(meta_faturamento) * 100) if meta_faturamento else 0
            },
            "funil": {
                "entradas": funil_data['F1'],
                "conversao": funil_data['F2'],
                "pos_exame": funil_data['F3'],
                "retencao": funil_data['F4'],
                "origem_vencedora": origem_vencedora
            },
            "riscos": {
                "nivel_alto": risco_alto_count,
                "nivel_medio": risco_medio_count,
                "taxa_evasao_prevista": round(taxa_risco, 1)
            },
            "graficos": {
                "evolucao_receita": grafico_evolucao,
                "origem_pie_chart": list(origem_stats)
            }
        }

        return Response(data)

# Endpoint auxiliar para salvar Metas (Configuração)
class MetaMensalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Define as metas e investimento do mês"""
        mes_ref = request.data.get('mes_referencia') # YYYY-MM-01
        
        obj, created = MetaMensal.objects.update_or_create(
            mes_referencia=mes_ref,
            defaults={
                'investimento_marketing': request.data.get('investimento_marketing', 0),
                'custos_fixos_estimados': request.data.get('custos_fixos', 0),
                'meta_faturamento': request.data.get('meta_faturamento', 0),
                'meta_novos_ciclos': request.data.get('meta_novos_ciclos', 0)
            }
        )
        return Response({"status": "Meta atualizada", "id": obj.id})