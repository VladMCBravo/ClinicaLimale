from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    CARGO_CHOICES = [
        ('admin', 'Administrador'),
        ('medico', 'Médico'),
        ('recepcao', 'Recepção'),
    ]
    # Adicionamos um campo 'cargo' com opções pré-definidas
    cargo = models.CharField(max_length=10, choices=CARGO_CHOICES, default='recepcao')