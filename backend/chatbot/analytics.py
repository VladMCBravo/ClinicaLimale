# chatbot/analytics.py
from django.utils import timezone
from datetime import timedelta
import json
from django.db import models

class AnalyticsManager:
    """Gerenciador de analytics do chatbot"""
    
    @staticmethod
    def registrar_evento(session_id, evento, dados=None):
        """Registra um evento de analytics"""
        from .models import ChatbotMetrics
        ChatbotMetrics.objects.create(
            session_id=session_id,
            evento=evento,
            dados_evento=dados or {}
        )
    
    @staticmethod
    def obter_metricas_periodo(dias=30):
        """Obtém métricas dos últimos N dias"""
        from .models import ChatbotMetrics
        inicio = timezone.now() - timedelta(days=dias)
        
        metricas = ChatbotMetrics.objects.filter(timestamp__gte=inicio)
        
        # Conversas iniciadas
        conversas_iniciadas = metricas.filter(evento='inicio_conversa').count()
        
        # Agendamentos completados
        agendamentos_completos = metricas.filter(evento='agendamento_completo').count()
        
        # Taxa de conversão
        taxa_conversao = (agendamentos_completos / conversas_iniciadas * 100) if conversas_iniciadas > 0 else 0
        
        # Estados mais comuns onde usuários abandonam
        abandonos = metricas.filter(evento='abandono_conversa').values('dados_evento__estado').annotate(
            count=models.Count('id')
        ).order_by('-count')[:5]
        
        # Especialidades mais procuradas
        especialidades = metricas.filter(
            evento='especialidade_selecionada'
        ).values('dados_evento__especialidade').annotate(
            count=models.Count('id')
        ).order_by('-count')[:10]
        
        return {
            'periodo_dias': dias,
            'conversas_iniciadas': conversas_iniciadas,
            'agendamentos_completos': agendamentos_completos,
            'taxa_conversao': round(taxa_conversao, 2),
            'principais_abandonos': list(abandonos),
            'especialidades_populares': list(especialidades),
            'tempo_medio_conversa': AnalyticsManager._calcular_tempo_medio_conversa(metricas)
        }
    
    @staticmethod
    def _calcular_tempo_medio_conversa(metricas):
        """Calcula tempo médio de conversa"""
        sessoes = {}
        
        for metrica in metricas.order_by('timestamp'):
            session_id = metrica.session_id
            if session_id not in sessoes:
                sessoes[session_id] = {
                    'inicio': metrica.timestamp,
                    'fim': metrica.timestamp
                }
            else:
                sessoes[session_id]['fim'] = metrica.timestamp
        
        if not sessoes:
            return 0
        
        tempos = []
        for sessao in sessoes.values():
            duracao = (sessao['fim'] - sessao['inicio']).total_seconds() / 60  # em minutos
            tempos.append(duracao)
        
        return round(sum(tempos) / len(tempos), 2) if tempos else 0
    
    @staticmethod
    def registrar_inicio_conversa(session_id, dados_usuario=None):
        """Registra início de conversa"""
        AnalyticsManager.registrar_evento(
            session_id, 
            'inicio_conversa', 
            dados_usuario or {}
        )
    
    @staticmethod
    def registrar_agendamento_completo(session_id, tipo_agendamento, especialidade=None):
        """Registra agendamento completado"""
        AnalyticsManager.registrar_evento(
            session_id,
            'agendamento_completo',
            {
                'tipo': tipo_agendamento,
                'especialidade': especialidade
            }
        )
    
    @staticmethod
    def registrar_abandono(session_id, estado_atual, motivo=None):
        """Registra abandono de conversa"""
        AnalyticsManager.registrar_evento(
            session_id,
            'abandono_conversa',
            {
                'estado': estado_atual,
                'motivo': motivo
            }
        )
    
    @staticmethod
    def registrar_erro(session_id, tipo_erro, detalhes=None):
        """Registra erro no chatbot"""
        AnalyticsManager.registrar_evento(
            session_id,
            'erro_chatbot',
            {
                'tipo_erro': tipo_erro,
                'detalhes': detalhes
            }
        )