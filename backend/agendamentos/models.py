# agendamentos/models.py - VERSÃO CORRIGIDA

from django.db import models
from pacientes.models import Paciente
from django.utils import timezone
from django.conf import settings

# <<-- NOVO MODELO ADICIONADO -->>
class Sala(models.Model):
    """Representa uma sala física na clínica."""
    nome = models.CharField(max_length=100, unique=True, help_text="Ex: Consultório 1, Sala de Ultrassom")
    descricao = models.TextField(blank=True, null=True, help_text="Qualquer detalhe adicional sobre a sala.")

    def __str__(self):
        return self.nome
    
class Agendamento(models.Model):
    TIPO_ATENDIMENTO_CHOICES = [('Convenio', 'Convênio'), ('Particular', 'Particular')]
    STATUS_CHOICES = [
    ('Agendado', 'Agendado'),
    ('Confirmado', 'Confirmado'),
    ('Aguardando', 'Aguardando na Recepção'), # NOVO
    ('Em Atendimento', 'Em Atendimento'),   # NOVO
    ('Realizado', 'Realizado'),
    ('Cancelado', 'Cancelado'),
    ('Não Compareceu', 'Não Compareceu')
]
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
# <<-- A MUDANÇA ESTÁ AQUI -->>
    # Trocamos 'blank=False' por 'blank=True'.
    # Isso permite que agendamentos (como os do chatbot) sejam criados sem uma sala definida.
    sala = models.ForeignKey(
        Sala, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, # <-- ALTERADO
        related_name='agendamentos',
        verbose_name="Sala de Atendimento"
    )

# --- CAMPOS DA NOVA LÓGICA ---
    tipo_agendamento = models.CharField(max_length=20, choices=TIPO_AGENDAMENTO_CHOICES, default='Consulta')
    medico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='agendamentos_como_medico',
        limit_choices_to={'cargo': 'medico'} 
    )
    especialidade = models.ForeignKey('usuarios.Especialidade', on_delete=models.SET_NULL, null=True, blank=True)
    tipo_visita = models.CharField(max_length=20, choices=TIPO_VISITA_CHOICES, default='Primeira Consulta', blank=True, null=True)
    modalidade = models.CharField(max_length=20, choices=MODALIDADE_CHOICES, default='Presencial', blank=True, null=True)
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='agendamentos')
    data_hora_inicio = models.DateTimeField()
    data_hora_fim = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Agendado')
    expira_em = models.DateTimeField(null=True, blank=True, verbose_name="Expira em")
    plano_utilizado = models.ForeignKey('faturamento.PlanoConvenio', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Plano Utilizado no Agendamento")
    procedimento = models.ForeignKey('faturamento.Procedimento', on_delete=models.SET_NULL, null=True, blank=True)
    link_telemedicina = models.URLField(max_length=500, blank=True, null=True, verbose_name="Link da Sala de Telemedicina")
    id_sala_telemedicina = models.CharField(max_length=200, blank=True, null=True, help_text="ID da sala retornado pela API de vídeo")
    tipo_atendimento = models.CharField(max_length=10, choices=TIPO_ATENDIMENTO_CHOICES, default='Particular')
    observacoes = models.TextField(blank=True, null=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    def __str__(self):
        hora_local = timezone.localtime(self.data_hora_inicio)
        data_formatada = hora_local.strftime('%d/%m/%Y às %H:%M')
        # Adiciona o nome da sala na representação do objeto
        return f"{self.paciente.nome_completo} em {self.sala.nome if self.sala else 'Sala não definida'} - {data_formatada}"