# agendamentos/models.py - VERSÃO CORRIGIDA

from django.db import models
from pacientes.models import Paciente
from django.utils import timezone
from django.conf import settings

# --- REMOVEMOS A IMPORTAÇÃO DIRETA ---
# from faturamento.models import PlanoConvenio # <-- APAGUE OU COMENTE ESTA LINHA

class Agendamento(models.Model):
    TIPO_ATENDIMENTO_CHOICES = [('Convenio', 'Convênio'), ('Particular', 'Particular')]
    STATUS_CHOICES = [('Agendado', 'Agendado'), ('Confirmado', 'Confirmado'), ('Cancelado', 'Cancelado'), ('Realizado', 'Realizado'), ('Não Compareceu', 'Não Compareceu')]

    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='agendamentos')
    data_hora_inicio = models.DateTimeField()
    data_hora_fim = models.DateTimeField()
    tipo_consulta = models.CharField(max_length=100, default='Consulta')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Agendado')
    
    # --- CORREÇÃO AQUI: Usamos a string 'app.Model' ---
    plano_utilizado = models.ForeignKey(
        'faturamento.PlanoConvenio', # <-- Em vez do objeto, usamos o caminho como string
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Plano Utilizado no Agendamento"
    )

    tipo_atendimento = models.CharField(max_length=10, choices=TIPO_ATENDIMENTO_CHOICES, default='Particular')
    observacoes = models.TextField(blank=True, null=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    def __str__(self):
        hora_local = timezone.localtime(self.data_hora_inicio)
        data_formatada = hora_local.strftime('%d/%m/%Y às %H:%M')
        return f"{self.paciente.nome_completo} - {data_formatada}"