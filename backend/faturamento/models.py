# backend/faturamento/models.py

from django.db import models
from django.conf import settings
from django.utils import timezone # Importar timezone para data_pagamento

# --- Modelo de Pagamento ---

class Pagamento(models.Model):
    FORMA_PAGAMENTO_CHOICES = [
        ('Dinheiro', 'Dinheiro'),
        ('CartaoCredito', 'Cartão de Crédito'),
        ('CartaoDebito', 'Cartão de Débito'),
        ('PIX', 'PIX'),
        ('Convenio', 'Convênio'),
    ]

    # --- ALTERAÇÃO 1: Novo campo de STATUS ---
    STATUS_PAGAMENTO_CHOICES = [
        ('Pendente', 'Pendente'),
        ('Pago', 'Pago'),
        ('Cancelado', 'Cancelado'),
    ]
    
    agendamento = models.OneToOneField(
        'agendamentos.Agendamento',
        on_delete=models.SET_NULL, 
        related_name='pagamento',
        null=True,
        blank=True
    )

    paciente = models.ForeignKey('pacientes.Paciente', on_delete=models.PROTECT)
    valor = models.DecimalField(max_digits=10, decimal_places=2)

    # --- ALTERAÇÃO 2: Permitir que estes campos fiquem vazios para pagamentos pendentes ---
    forma_pagamento = models.CharField(
        max_length=20, 
        choices=FORMA_PAGAMENTO_CHOICES, 
        blank=True, 
        null=True
    )
    # auto_now_add=True foi removido. A data será preenchida apenas quando o pagamento for confirmado.
    data_pagamento = models.DateTimeField(blank=True, null=True)

    # --- ALTERAÇÃO 3: Adicionamos o campo status ao modelo ---
    status = models.CharField(
        max_length=20,
        choices=STATUS_PAGAMENTO_CHOICES,
        default='Pendente'
    )

    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT
    )

    # --- ALTERAÇÃO 4: Melhoramos o __str__ para mostrar o status ---
    def __str__(self):
        return f"Pagamento de R$ {self.valor} para {self.paciente.nome_completo} ({self.status})"

    def save(self, *args, **kwargs):
        # Preenche a data de pagamento automaticamente quando o status muda para "Pago"
        if self.status == 'Pago' and self.data_pagamento is None:
            self.data_pagamento = timezone.now()
        super().save(*args, **kwargs)


# --- O restante do arquivo (Despesas, Convênios) permanece o mesmo ---

class CategoriaDespesa(models.Model):
    # ... (sem alterações) ...
    nome = models.CharField(max_length=100, unique=True)
    descricao = models.TextField(blank=True, null=True)
    def __str__(self): return self.nome
    class Meta:
        verbose_name = "Categoria de Despesa"
        verbose_name_plural = "Categorias de Despesas"
        ordering = ['nome']

class Despesa(models.Model):
    # ... (sem alterações) ...
    categoria = models.ForeignKey(CategoriaDespesa, on_delete=models.PROTECT, related_name='despesas')
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data_despesa = models.DateField()
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    data_registro = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"{self.descricao} - R$ {self.valor}"
    class Meta:
        ordering = ['-data_despesa']
        verbose_name = "Despesa"
        verbose_name_plural = "Despesas"

class Convenio(models.Model):
    # ... (sem alterações) ...
    nome = models.CharField(max_length=100, unique=True)
    ativo = models.BooleanField(default=True)
    class Meta: ordering = ['nome']
    def __str__(self): return self.nome

class PlanoConvenio(models.Model):
    # ... (sem alterações) ...
    convenio = models.ForeignKey(Convenio, on_delete=models.CASCADE, related_name='planos')
    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True, null=True)
    ativo = models.BooleanField(default=True)
    class Meta:
        ordering = ['convenio__nome', 'nome']
        unique_together = ('convenio', 'nome')
    def __str__(self): return f"{self.convenio.nome} - {self.nome}"