# chatbot/models.py
from django.db import models

class ChatMemory(models.Model):
    session_id = models.CharField(max_length=255, unique=True, db_index=True)
    memory_data = models.JSONField(default=dict) # Alterado para dict para consistência
    state = models.CharField(max_length=100, null=True, blank=True, default='inicio')
    # NOVO CAMPO: Guarda o estado anterior antes do aviso de inatividade
    previous_state = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Memória para {self.session_id}"
    
    class Meta:
        verbose_name = "Memória de Conversa"
        verbose_name_plural = "Memórias de Conversas"
        ordering = ['-updated_at']

class ChatbotMetrics(models.Model):
    """Modelo para armazenar métricas do chatbot"""
    session_id = models.CharField(max_length=255, db_index=True)
    evento = models.CharField(max_length=100)  # 'inicio_conversa', 'agendamento_completo', etc.
    dados_evento = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Métrica do Chatbot"
        verbose_name_plural = "Métricas do Chatbot"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['evento', 'timestamp']),
            models.Index(fields=['session_id', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.evento} - {self.session_id} - {self.timestamp.strftime('%d/%m/%Y %H:%M')}"
