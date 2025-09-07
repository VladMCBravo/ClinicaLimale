# usuarios/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models

# --- NOVO MODEL ADICIONADO AQUI ---
class Especialidade(models.Model):
    nome = models.CharField(max_length=100, unique=True, verbose_name="Nome da Especialidade")

 # Para armazenar o valor da consulta particular.
    valor_consulta = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True, # Importante para não dar erro nos dados que já existem
        blank=True,
        verbose_name="Valor da Consulta Particular"
    )

    def __str__(self):
        return self.nome
    
    class Meta:
        verbose_name = "Especialidade"
        verbose_name_plural = "Especialidades"
        ordering = ['nome']


class CustomUser(AbstractUser):
    CARGO_CHOICES = [
        ('admin', 'Administrador'),
        ('medico', 'Médico'),
        ('recepcao', 'Recepção'),
    ]
    cargo = models.CharField(max_length=10, choices=CARGO_CHOICES, default='recepcao')
    
    # Campo para o CRM, que só será preenchido se o cargo for 'medico'.
    crm = models.CharField(max_length=20, blank=True, null=True, unique=True, verbose_name="CRM")
    
    # --- NOVA LINHA ADICIONADA AQUI ---
    # Ligamos as especialidades diretamente ao usuário, já que médicos são usuários.
    especialidades = models.ManyToManyField(
        Especialidade, 
        blank=True, 
        verbose_name="Especialidades do Profissional"
    )