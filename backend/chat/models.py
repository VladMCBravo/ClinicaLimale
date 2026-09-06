from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError

User = get_user_model()

class ChatRoom(models.Model):
    name = models.CharField(max_length=255, verbose_name="Nome do Consultório/Grupo")
    
    # Fazendo a ponte com o app agendamentos (Opcional, mas muito útil)
    sala_vinculada = models.OneToOneField(
        'agendamentos.Sala', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='chat_room'
    )
    
    # Apenas os médicos ou profissionais específicos que batem ponto/atendem nesta sala
    membros = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='chat_rooms',
        blank=True
    )

    def __str__(self):
        return self.name

    def user_has_access(self, user):
        """
        Verifica se o usuário tem permissão para ler e enviar mensagens neste grupo.
        """
        cargos_globais = ['admin', 'medico_admin', 'recepcao', 'diretoria'] 
        if hasattr(user, 'cargo') and user.cargo in cargos_globais:
            return True
        
        if user.is_superuser:
            return True
            
        return self.membros.filter(id=user.id).exists()


class Message(models.Model):
    ATTACHMENT_TYPES = (
        ('text', 'Texto Simples'),
        ('appointment', 'Agendamento'),
        ('patient', 'Contato de Paciente'),
        ('document', 'Documento Médico'), # Mantive o do seu frontend ('document')
        ('status_alert', 'Alerta de Status de Agendamento'),
    )

    sender = models.ForeignKey(User, related_name='sent_messages', on_delete=models.CASCADE)
    
    # MUDANÇA AQUI: Agora receiver é opcional para permitir envio para o grupo
    receiver = models.ForeignKey(
        User, 
        related_name='received_messages', 
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    # NOVO CAMPO: Sala de Chat (Grupo)
    room = models.ForeignKey(
        ChatRoom, 
        on_delete=models.CASCADE, 
        related_name='messages', 
        null=True, 
        blank=True
    )

    content = models.TextField(blank=True, null=True)
    
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
            models.Index(fields=['room']), # Adicionado índice para otimizar busca por grupo
        ]

    def clean(self):
        # Validação cruzada: Garante que a mensagem não vá para o limbo nem para dois lugares ao mesmo tempo
        if not self.receiver and not self.room:
            raise ValidationError("A mensagem deve ter um destinatário direto (receiver) OU uma sala (room).")
        if self.receiver and self.room:
            raise ValidationError("A mensagem não pode ser enviada para um usuário e um grupo simultaneamente.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        destino = f"Grupo: {self.room.name}" if self.room else f"P2P: {self.receiver.first_name}"
        return f"De {self.sender.first_name} -> {destino}"


class UserPresence(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='presence')
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(default=timezone.now)