# agendamentos/models.py - VERSÃO CORRIGIDA

from django.db import models
from pacientes.models import Paciente
from django.utils import timezone
from django.conf import settings

class Agendamento(models.Model):
    TIPO_ATENDIMENTO_CHOICES = [('Convenio', 'Convênio'), ('Particular', 'Particular')]
    STATUS_CHOICES = [('Agendado', 'Agendado'), ('Confirmado', 'Confirmado'), ('Cancelado', 'Cancelado'), ('Realizado', 'Realizado'), ('Não Compareceu', 'Não Compareceu')]
 # --- A DEFINIÇÃO QUE FALTAVA ESTÁ AQUI ---
    TIPO_AGENDAMENTO_CHOICES = [
        ('Consulta', 'Consulta'),
        ('Procedimento', 'Procedimento'),
    ]
 # --- NOVOS CAMPOS PARA CLASSIFICAÇÃO ---
    TIPO_VISITA_CHOICES = [
        ('Primeira Consulta', 'Primeira Consulta'),
        ('Retorno', 'Retorno'),
    ]
    MODALIDADE_CHOICES = [
        ('Presencial', 'Presencial'),
        ('Telemedicina', 'Telemedicina'),
    ]

# --- CAMPOS DA NOVA LÓGICA ---
    tipo_agendamento = models.CharField(max_length=20, choices=TIPO_AGENDAMENTO_CHOICES, default='Consulta')
    
    # Campo 'medico' aponta para o seu CustomUser e filtra para mostrar apenas médicos
    medico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agendamentos_como_medico',
        # Dica de ouro: Isso filtra a lista para mostrar apenas usuários com cargo 'medico' no admin!
        limit_choices_to={'cargo': 'medico'} 
    )
    
    # Campo 'especialidade' aponta para o seu modelo no app 'usuarios'
    especialidade = models.ForeignKey(
        'usuarios.Especialidade',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    tipo_visita = models.CharField(
        max_length=20, 
        choices=TIPO_VISITA_CHOICES, 
        default='Primeira Consulta', 
        blank=True, 
        null=True
    )
    modalidade = models.CharField(
        max_length=20, 
        choices=MODALIDADE_CHOICES, 
        default='Presencial', 
        blank=True, 
        null=True
    )
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='agendamentos')
    data_hora_inicio = models.DateTimeField()
    data_hora_fim = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Agendado')
    expira_em = models.DateTimeField(null=True, blank=True, verbose_name="Expira em")

    # --- CORREÇÃO AQUI: Usamos a string 'app.Model' ---
    plano_utilizado = models.ForeignKey(
        'faturamento.PlanoConvenio', # <-- Em vez do objeto, usamos o caminho como string
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Plano Utilizado no Agendamento"
    )
    # --- NOVA LIGAÇÃO AO PROCEDIMENTO ---
    procedimento = models.ForeignKey(
        'faturamento.Procedimento',
        on_delete=models.SET_NULL,
        null=True,
        blank=True # Permite agendamentos sem procedimento definido inicialmente
    )
    # --- NOVOS CAMPOS PARA TELEMEDICINA ---
    link_telemedicina = models.URLField(max_length=500, blank=True, null=True, verbose_name="Link da Sala de Telemedicina")
    id_sala_telemedicina = models.CharField(max_length=200, blank=True, null=True, help_text="ID da sala retornado pela API de vídeo")
    # ------------------------------------
    tipo_atendimento = models.CharField(max_length=10, choices=TIPO_ATENDIMENTO_CHOICES, default='Particular')
    observacoes = models.TextField(blank=True, null=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    def __str__(self):
        hora_local = timezone.localtime(self.data_hora_inicio)
        data_formatada = hora_local.strftime('%d/%m/%Y às %H:%M')
        return f"{self.paciente.nome_completo} - {data_formatada}"