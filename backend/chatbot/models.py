# chatbot/models.py
from django.db import models

class ChatMemory(models.Model):
    session_id = models.CharField(max_length=255, unique=True, db_index=True)
    memory_data = models.JSONField(default=list)
    state = models.CharField(max_length=100, null=True, blank=True, default='inicio')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Memória para {self.session_id}"