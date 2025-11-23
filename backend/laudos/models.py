from django.db import models
from django.conf import settings
from pacientes.models import Paciente
# Se você tiver um app de agendamentos, importe o modelo aqui. 
# Ex: from agendamentos.models import Agendamento (Se não tiver, deixe comentado)

class ModeloLaudo(models.Model):
    """
    Substitui os templates do Turing.
    Aqui guardaremos os textos padrões (Ex: 'USG Obstétrico', 'USG Tireoide').
    """
    titulo = models.CharField(max_length=255, unique=True)
    codigo_procedimento = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
        help_text="Código TUSS ou interno para puxar automaticamente ao agendar"
    )
    
    # Guardaremos o conteúdo como JSON para ser compatível com editores modernos (TipTap/Quill)
    # ou HTML puro. JSON é melhor para as "variáveis clicáveis".
    conteudo_padrao = models.JSONField(default=dict) 
    
    especialidade = models.CharField(max_length=100, default='Radiologia')
    ativo = models.BooleanField(default=True)

    def __str__(self):
        return self.titulo

class Laudo(models.Model):
    """
    O documento final gerado para um paciente específico.
    """
    STATUS_CHOICES = [
        ('RASCUNHO', 'Rascunho'),
        ('ASSINADO', 'Assinado/Finalizado'),
    ]

    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='laudos')
    medico = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT,
        related_name='laudos_realizados'
    )
    
    # Vínculo opcional com o agendamento (para saber de qual consulta é esse laudo)
    agendamento_id = models.IntegerField(null=True, blank=True)
    
    # Título do exame realizado
    titulo_exame = models.CharField(max_length=255)
    
    # O conteúdo final editado pelo médico
    conteudo_laudo = models.JSONField(default=dict)
    
    # Texto puro para facilitar busca (Full Text Search) no futuro
    texto_puro = models.TextField(blank=True)

    # Imagens que o médico selecionou para sair no PDF
    # Ex: ["http://orthanc.../preview1.jpg", "http://orthanc.../preview2.jpg"]
    imagens_selecionadas = models.JSONField(default=list, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RASCUNHO')
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.titulo_exame} - {self.paciente.nome_completo}"