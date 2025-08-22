from django.db import models
from pacientes.models import Paciente
from django.utils import timezone # <- 1. IMPORTAMOS A FERRAMENTA DE FUSO HORÁRIO
from faturamento.models import PlanoConvenio # <-- IMPORTE O MODELO

class Agendamento(models.Model):
    STATUS_CHOICES = [
        ('Agendado', 'Agendado'),
        ('Confirmado', 'Confirmado'),
        ('Cancelado', 'Cancelado'),
        ('Realizado', 'Realizado'),
        ('Não Compareceu', 'Não Compareceu'),
    ]

    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE)
    data_hora_inicio = models.DateTimeField()
    data_hora_fim = models.DateTimeField()
    tipo_consulta = models.CharField(max_length=100, default='Consulta')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Agendado')
    observacoes = models.TextField(blank=True, null=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

     # --- NOVO CAMPO ---
    plano_utilizado = models.ForeignKey(
        PlanoConvenio,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Plano Utilizado no Agendamento"
    )

    def __str__(self):
        # 2. CONVERTEMOS A HORA UTC DO BANCO PARA O FUSO LOCAL
        hora_local = timezone.localtime(self.data_hora_inicio)
        data_formatada = hora_local.strftime('%d/%m/%Y às %H:%M')
        return f"{self.paciente.nome_completo} - {data_formatada}"