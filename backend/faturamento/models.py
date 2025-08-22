from django.db import models
from django.conf import settings


# --- Modelo de Pagamento ---

class Pagamento(models.Model):
    FORMA_PAGAMENTO_CHOICES = [
        ('Dinheiro', 'Dinheiro'),
        ('CartaoCredito', 'Cartão de Crédito'),
        ('CartaoDebito', 'Cartão de Débito'),
        ('PIX', 'PIX'),
        ('Convenio', 'Convênio'),
    ]
    
    # Usamos strings para referenciar os modelos de outros apps
    agendamento = models.OneToOneField(
        'agendamentos.Agendamento', # <-- MUDANÇA AQUI
        on_delete=models.SET_NULL, 
        related_name='pagamento',
        null=True,
        blank=True
    )

    paciente = models.ForeignKey('pacientes.Paciente', on_delete=models.PROTECT) # <-- MUDANÇA AQUI
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    forma_pagamento = models.CharField(max_length=20, choices=FORMA_PAGAMENTO_CHOICES)
    data_pagamento = models.DateTimeField(auto_now_add=True)

    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT
    )

    def __str__(self):
        return f"Pagamento de R$ {self.valor} para {self.paciente.nome_completo}"

# --- Novos Modelos para Gestão de Despesas ---

class CategoriaDespesa(models.Model):
    """
    Modelo para organizar as despesas.
    Ex: Salários, Aluguel, Marketing, Materiais de Escritório.
    """
    nome = models.CharField(max_length=100, unique=True)
    descricao = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nome

    class Meta:
        verbose_name = "Categoria de Despesa"
        verbose_name_plural = "Categorias de Despesas"
        ordering = ['nome']


class Despesa(models.Model):
    """
    Modelo para registrar cada despesa individual da clínica.
    """
    categoria = models.ForeignKey(CategoriaDespesa, on_delete=models.PROTECT, related_name='despesas')
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data_despesa = models.DateField()
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    data_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.descricao} - R$ {self.valor}"

    class Meta:
        ordering = ['-data_despesa']
        verbose_name = "Despesa"
        verbose_name_plural = "Despesas"

class Convenio(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ['nome']

    def __str__(self):
        return self.nome

class PlanoConvenio(models.Model):
    convenio = models.ForeignKey(Convenio, on_delete=models.CASCADE, related_name='planos')
    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True, null=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ['convenio__nome', 'nome']
        # Garante que não haja planos com mesmo nome no mesmo convênio
        unique_together = ('convenio', 'nome')

    def __str__(self):
        return f"{self.convenio.nome} - {self.nome}"