# chatbot/dashboard_views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsAdminUser
from django.utils import timezone
from datetime import timedelta
from .analytics import AnalyticsManager
from .models import ChatbotMetrics
from .models import ChatMemory
from django.db.models import Count, Avg
import json

class ChatbotDashboardView(APIView):
    """Dashboard com métricas do chatbot"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        dias = int(request.query_params.get('dias', 30))
        
        # Métricas básicas
        metricas_basicas = AnalyticsManager.obter_metricas_periodo(dias)
        
        # Métricas adicionais
        inicio_periodo = timezone.now() - timedelta(days=dias)
        
        # Estados onde mais usuários abandonam
        estados_abandono = ChatMemory.objects.filter(
            updated_at__gte=inicio_periodo
        ).exclude(
            state__in=['inicio', 'identificando_demanda']
        ).values('state').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Horários de maior atividade
        metricas_por_hora = ChatbotMetrics.objects.filter(
            timestamp__gte=inicio_periodo
        ).extra(
            select={'hora': 'EXTRACT(hour FROM timestamp)'}
        ).values('hora').annotate(
            count=Count('id')
        ).order_by('hora')
        
        # Sessões por dia
        sessoes_por_dia = ChatbotMetrics.objects.filter(
            timestamp__gte=inicio_periodo,
            evento='inicio_conversa'
        ).extra(
            select={'dia': 'DATE(timestamp)'}
        ).values('dia').annotate(
            count=Count('id')
        ).order_by('dia')
        
        # Tempo médio por estado
        tempo_por_estado = self._calcular_tempo_por_estado(inicio_periodo)
        
        return Response({
            'periodo': {
                'dias': dias,
                'inicio': inicio_periodo.isoformat(),
                'fim': timezone.now().isoformat()
            },
            'metricas_basicas': metricas_basicas,
            'estados_abandono': list(estados_abandono),
            'atividade_por_hora': list(metricas_por_hora),
            'sessoes_por_dia': list(sessoes_por_dia),
            'tempo_por_estado': tempo_por_estado,
            'resumo': self._gerar_resumo_insights(metricas_basicas, estados_abandono)
        })
    
    def _calcular_tempo_por_estado(self, inicio_periodo):
        """Calcula tempo médio gasto em cada estado"""
        memorias = ChatMemory.objects.filter(
            updated_at__gte=inicio_periodo
        ).exclude(state='inicio')
        
        tempos_por_estado = {}
        
        for memoria in memorias:
            historico = memoria.memory_data.get('historico_conversa', [])
            if not historico:
                continue
            
            for i, interacao in enumerate(historico[:-1]):
                estado_atual = interacao.get('estado')
                timestamp_atual = interacao.get('timestamp')
                timestamp_proximo = historico[i + 1].get('timestamp')
                
                if estado_atual and timestamp_atual and timestamp_proximo:
                    try:
                        tempo_atual = timezone.datetime.fromisoformat(timestamp_atual.replace('Z', '+00:00'))
                        tempo_proximo = timezone.datetime.fromisoformat(timestamp_proximo.replace('Z', '+00:00'))
                        duracao = (tempo_proximo - tempo_atual).total_seconds() / 60  # em minutos
                        
                        if estado_atual not in tempos_por_estado:
                            tempos_por_estado[estado_atual] = []
                        tempos_por_estado[estado_atual].append(duracao)
                    except:
                        continue
        
        # Calcula médias
        medias_por_estado = {}
        for estado, tempos in tempos_por_estado.items():
            if tempos:
                medias_por_estado[estado] = {
                    'tempo_medio_minutos': round(sum(tempos) / len(tempos), 2),
                    'total_ocorrencias': len(tempos)
                }
        
        return medias_por_estado
    
    def _gerar_resumo_insights(self, metricas_basicas, estados_abandono):
        """Gera insights automáticos"""
        insights = []
        
        # Taxa de conversão
        taxa_conversao = metricas_basicas.get('taxa_conversao', 0)
        if taxa_conversao < 20:
            insights.append({
                'tipo': 'alerta',
                'titulo': 'Taxa de conversão baixa',
                'descricao': f'Apenas {taxa_conversao}% das conversas resultam em agendamento',
                'sugestao': 'Revisar fluxo de agendamento e pontos de abandono'
            })
        elif taxa_conversao > 50:
            insights.append({
                'tipo': 'sucesso',
                'titulo': 'Excelente taxa de conversão',
                'descricao': f'{taxa_conversao}% das conversas resultam em agendamento',
                'sugestao': 'Manter estratégia atual'
            })
        
        # Estados de abandono
        if estados_abandono:
            estado_mais_abandono = estados_abandono[0]
            insights.append({
                'tipo': 'atencao',
                'titulo': 'Principal ponto de abandono',
                'descricao': f'Estado "{estado_mais_abandono["state"]}" tem {estado_mais_abandono["count"]} abandonos',
                'sugestao': 'Revisar experiência neste estado específico'
            })
        
        # Tempo médio
        tempo_medio = metricas_basicas.get('tempo_medio_conversa', 0)
        if tempo_medio > 15:
            insights.append({
                'tipo': 'alerta',
                'titulo': 'Conversas muito longas',
                'descricao': f'Tempo médio de {tempo_medio} minutos por conversa',
                'sugestao': 'Simplificar fluxo ou melhorar coleta de dados'
            })
        
        return insights

class ChatbotHealthCheckView(APIView):
    """Verificação de saúde do sistema de chatbot"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        agora = timezone.now()
        
        # Conversas ativas (últimas 24h)
        conversas_ativas = ChatMemory.objects.filter(
            updated_at__gte=agora - timedelta(hours=24)
        ).count()
        
        # Conversas travadas (mesmo estado há mais de 1 hora)
        conversas_travadas = ChatMemory.objects.filter(
            updated_at__lt=agora - timedelta(hours=1)
        ).exclude(state__in=['inicio', 'identificando_demanda']).count()
        
        # Erros recentes
        erros_recentes = ChatbotMetrics.objects.filter(
            evento='erro_chatbot',
            timestamp__gte=agora - timedelta(hours=24)
        ).count()
        
        # Status geral
        status = 'saudavel'
        if conversas_travadas > 10 or erros_recentes > 5:
            status = 'atencao'
        if conversas_travadas > 50 or erros_recentes > 20:
            status = 'critico'
        
        return Response({
            'status': status,
            'timestamp': agora.isoformat(),
            'metricas': {
                'conversas_ativas_24h': conversas_ativas,
                'conversas_travadas': conversas_travadas,
                'erros_recentes_24h': erros_recentes
            },
            'recomendacoes': self._gerar_recomendacoes_saude(conversas_travadas, erros_recentes)
        })
    
    def _gerar_recomendacoes_saude(self, travadas, erros):
        """Gera recomendações baseadas na saúde do sistema"""
        recomendacoes = []
        
        if travadas > 10:
            recomendacoes.append({
                'prioridade': 'alta',
                'acao': 'Verificar conversas travadas',
                'detalhes': f'{travadas} conversas podem estar travadas'
            })
        
        if erros > 5:
            recomendacoes.append({
                'prioridade': 'media',
                'acao': 'Investigar erros recentes',
                'detalhes': f'{erros} erros nas últimas 24 horas'
            })
        
        if not recomendacoes:
            recomendacoes.append({
                'prioridade': 'info',
                'acao': 'Sistema funcionando normalmente',
                'detalhes': 'Nenhuma ação necessária'
            })
        
        return recomendacoes