# usuarios/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings # Importe o settings
from django.utils.translation import gettext_lazy as _

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

class JornadaDeTrabalho(models.Model):
    class DiaSemana(models.IntegerChoices):
        SEGUNDA = 0, _('Segunda-feira')
        TERCA = 1, _('Terça-feira')
        QUARTA = 2, _('Quarta-feira')
        QUINTA = 3, _('Quinta-feira')
        SEXTA = 4, _('Sexta-feira')
        SABADO = 5, _('Sábado')
        DOMINGO = 6, _('Domingo')

    medico = models.ForeignKey(
        settings.AUTH_USER_MODEL, # Usar settings é a forma mais robusta
        on_delete=models.CASCADE,
        related_name='jornadas_de_trabalho',
        limit_choices_to={'cargo': 'medico'} # Garante que só médicos possam ter jornada
    )
    dia_da_semana = models.IntegerField(choices=DiaSemana.choices)
    hora_inicio = models.TimeField()
    hora_fim = models.TimeField()

    class Meta:
        verbose_name = "Jornada de Trabalho"
        verbose_name_plural = "Jornadas de Trabalho"
        unique_together = ('medico', 'dia_da_semana', 'hora_inicio')

    def __str__(self):
        # Usar self.medico.get_full_name() é mais seguro caso o nome não esteja preenchido
        nome_medico = self.medico.get_full_name() or self.medico.username
        return f"{nome_medico} - {self.get_dia_da_semana_display()}: {self.hora_inicio.strftime('%H:%M')} às {self.hora_fim.strftime('%H:%M')}"