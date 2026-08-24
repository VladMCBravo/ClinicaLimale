from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class Message(models.Model):
    ATTACHMENT_TYPES = (
        ('text', 'Texto Simples'),
        ('appointment', 'Agendamento'),
        ('patient', 'Contato de Paciente'),
        ('status_alert', 'Alerta de Status de Agendamento'),
    )

    sender = models.ForeignKey(User, related_name='sent_messages', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='received_messages', on_delete=models.CASCADE)
    content = models.TextField(blank=True, null=True)
    
    # Armazena o ID do Paciente ou Agendamento
    attachment_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPES, default='text')
    attachment_id = models.IntegerField(null=True, blank=True) 

    is_delivered = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['sender', 'receiver']),
        ]

class UserPresence(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='presence')
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(default=timezone.now)