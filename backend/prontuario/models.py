from django.db import models
from django.conf import settings
from pacientes.models import Paciente

class Evolucao(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='evolucoes')
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    data_atendimento = models.DateTimeField(auto_now_add=True)
    notas_subjetivas = models.TextField(verbose_name="Subjetivo (S)")
    notas_objetivas = models.TextField(verbose_name="Objetivo (O)")
    avaliacao = models.TextField(verbose_name="Avaliação (A)")
    plano = models.TextField(verbose_name="Plano (P)")

    class Meta:
        ordering = ['-data_atendimento']

    def __str__(self):
        return f"Evolução de {self.paciente.nome_completo} em {self.data_atendimento.strftime('%d/%m/%Y')}"

class Prescricao(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='prescricoes')
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    data_prescricao = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_prescricao']

    def __str__(self):
        return f"Prescrição para {self.paciente.nome_completo} em {self.data_prescricao.strftime('%d/%m/%Y')}"

class ItemPrescricao(models.Model):
    prescricao = models.ForeignKey(Prescricao, on_delete=models.CASCADE, related_name='itens')
    medicamento = models.CharField(max_length=200)
    dosagem = models.CharField(max_length=100)
    instrucoes = models.TextField(verbose_name="Instruções de Uso")

    def __str__(self):
        return f"{self.medicamento} ({self.dosagem})"

class Anamnese(models.Model):
    paciente = models.OneToOneField(Paciente, on_delete=models.CASCADE, related_name='anamnese')
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)
    queixa_principal = models.TextField(blank=True)
    historia_doenca_atual = models.TextField(blank=True)
    historico_medico_pregresso = models.TextField(blank=True)
    historico_familiar = models.TextField(blank=True)
    alergias = models.TextField(blank=True)
    medicamentos_em_uso = models.TextField(blank=True)

    def __str__(self):
        return f"Anamnese de {self.paciente.nome_completo}"

class Atestado(models.Model):
    TIPO_CHOICES = [
        ('Comparecimento', 'Atestado de Comparecimento'),
        ('Afastamento', 'Atestado de Afastamento'),
        ('Aptidao', 'Atestado de Aptidão Física'),
    ]
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='atestados')
    medico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    data_emissao = models.DateTimeField(auto_now_add=True)
    tipo_atestado = models.CharField(max_length=20, choices=TIPO_CHOICES)
    observacoes = models.TextField(help_text="Texto do atestado, incluindo informações como CID, dias de afastamento, etc.")

    class Meta:
        ordering = ['-data_emissao']

    def __str__(self):
        return f"Atestado de {self.get_tipo_atestado_display()} para {self.paciente.nome_completo}"

class DocumentoPaciente(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='documentos')
    titulo = models.CharField(max_length=100)
    arquivo = models.FileField(upload_to='documentos_pacientes/')
    data_upload = models.DateTimeField(auto_now_add=True)
    enviado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.titulo} - {self.paciente.nome_completo}"
