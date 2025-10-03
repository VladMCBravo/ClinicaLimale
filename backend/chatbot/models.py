# chatbot/models.py
from django.db import models
from django.core.exceptions import ValidationError
import json

def validate_json_data(value):
    """Valida se os dados JSON são válidos"""
    if not isinstance(value, dict):
        raise ValidationError('Dados devem ser um dicionário válido')

    # Limita o tamanho dos dados
    if len(json.dumps(value)) > 10000:
        raise ValidationError('Dados JSON muito grandes')

class ChatMemory(models.Model):
    session_id = models.CharField(max_length=50, unique=True, db_index=True)
    memory_data = models.JSONField(default=dict, validators=[validate_json_data])
    state = models.CharField(max_length=100, null=True, blank=True, default='inicio')
    previous_state = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        # Sanitiza o session_id
        if self.session_id:
            self.session_id = ''.join(c for c in self.session_id if c.isalnum() or c in '-_.')[:50]

    def __str__(self):
        from django.utils.html import escape
        return f"Memória para {escape(self.session_id)}"

    class Meta:
        verbose_name = "Memória de Conversa"
        verbose_name_plural = "Memórias de Conversas"
        ordering = ['-updated_at']

class ChatbotMetrics(models.Model):
    """Modelo para armazenar métricas do chatbot"""
    session_id = models.CharField(max_length=50, db_index=True)
    evento = models.CharField(max_length=100)
    dados_evento = models.JSONField(default=dict, validators=[validate_json_data])
    timestamp = models.DateTimeField(auto_now_add=True)

    def clean(self):
        # Sanitiza o session_id
        if self.session_id:
            self.session_id = ''.join(c for c in self.session_id if c.isalnum() or c in '-_.')[:50]

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