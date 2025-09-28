# backend/faturamento/models.py

from django.db import models
from django.conf import settings
from django.utils import timezone

class Pagamento(models.Model):
    # ... (seus campos e choices existentes permanecem iguais)
    FORMA_PAGAMENTO_CHOICES = [
        ('Dinheiro', 'Dinheiro'),
        ('CartaoCredito', 'Cartão de Crédito'),
        ('CartaoDebito', 'Cartão de Débito'),
        ('PIX', 'PIX'),
        ('Convenio', 'Convênio'),
        # Adicionado para pagamentos presenciais
        ('MaquinaCartao', 'Máquina de Cartão'), 
    ]
    STATUS_PAGAMENTO_CHOICES = [
        ('Pendente', 'Pendente'),
        ('Pago', 'Pago'),
        ('Cancelado', 'Cancelado'),
        ('Expirado', 'Expirado'), # Novo status para controle
    ]
    
    agendamento = models.OneToOneField(
        'agendamentos.Agendamento',
        on_delete=models.SET_NULL, 
        related_name='pagamento',
        null=True,
        blank=True
    )
    paciente = models.ForeignKey('pacientes.Paciente', on_delete=models.PROTECT)
    descricao = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Descrição para lançamentos avulsos ou observações."
    )
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    forma_pagamento = models.CharField(max_length=20, choices=FORMA_PAGAMENTO_CHOICES, blank=True, null=True)
    data_pagamento = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_PAGAMENTO_CHOICES, default='Pendente')
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    # --- NOVOS CAMPOS PARA INTEGRAÇÃO PIX (INTER) ---
    inter_txid = models.CharField(max_length=50, blank=True, null=True, unique=True, help_text="ID da transação gerado pelo Banco Inter")
    pix_copia_e_cola = models.TextField(blank=True, null=True)
    pix_qr_code_base64 = models.TextField(blank=True, null=True, help_text="Imagem do QR Code em formato base64")
    pix_expira_em = models.DateTimeField(blank=True, null=True, help_text="Data e hora em que a cobrança PIX expira")
    # --- NOVO CAMPO PARA LINK DE CARTÃO ---
    link_pagamento = models.URLField(max_length=500, blank=True, null=True, help_text="URL do link de pagamento para Cartão de Crédito")


    def __str__(self):
        if self.agendamento:
            return f"Pagamento de R$ {self.valor} para {self.paciente.nome_completo} ({self.status})"
        return f"Lançamento Avulso: {self.descricao} - R$ {self.valor} ({self.status})"


    def save(self, *args, **kwargs):
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

# --- NOVOS MODELOS PARA FATURAMENTO TISS ---

class LoteFaturamento(models.Model):
    # ... (sem alterações dentro deste modelo)
    STATUS_LOTE_CHOICES = [('Aberto', 'Em Aberto'), ('Enviado', 'Enviado para o Convênio'), ('Pago', 'Pago'), ('Pago com Glosa', 'Pago com Glosa'), ('Recusado', 'Recusado')]
    convenio = models.ForeignKey('faturamento.Convenio', on_delete=models.PROTECT, related_name='lotes')
    mes_referencia = models.DateField()
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_envio = models.DateTimeField(null=True, blank=True)
    valor_total_lote = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_LOTE_CHOICES, default='Aberto')
    gerado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    def __str__(self):
        mes_ano = self.mes_referencia.strftime('%m/%Y')
        return f"Lote para {self.convenio.nome} - Ref: {mes_ano} ({self.status})"
    
    class Meta: ordering = ['-mes_referencia']

class GuiaTiss(models.Model):
    lote = models.ForeignKey(LoteFaturamento, on_delete=models.CASCADE, related_name='guias')
    
    # --- CORREÇÃO AQUI: Usamos a string 'app.Model' ---
    agendamento = models.OneToOneField(
        'agendamentos.Agendamento', # <-- Em vez do objeto, usamos o caminho como string
        on_delete=models.PROTECT, 
        related_name='guia_tiss'
    )
    
    valor_guia = models.DecimalField(max_digits=10, decimal_places=2)
    status_guia = models.CharField(max_length=100, default="Enviada")
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Guia para o agendamento ID {self.agendamento.id} no Lote {self.lote.id}"

class Procedimento(models.Model):
    """
    Representa um procedimento médico com seu código TUSS e valor.
    Ex: Consulta em consultório, aplicação de medicação, etc.
    """
    codigo_tuss = models.CharField(max_length=20, unique=True, help_text="Código do procedimento na tabela TUSS")
    descricao = models.CharField(max_length=255)
    descricao_detalhada = models.TextField(
        blank=True, 
        verbose_name="Descrição Detalhada para Chatbot",
        help_text="Texto completo que o chatbot usará para descrever o exame."
    )
    # --- ALTERAÇÃO 1: Renomeamos 'valor' para ser mais específico ---
    valor_particular = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Valor Particular (R$)")
    ativo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.codigo_tuss} - {self.descricao}"

    class Meta:
        ordering = ['descricao']
    
    

# --- NOVO MODEL ADICIONADO AQUI ---
# Coloque este código logo abaixo do modelo Procedimento
class ValorProcedimentoConvenio(models.Model):
    """
    Tabela de preços: Liga um Procedimento a um Plano de Convênio 
    e define um valor específico para essa combinação.
    """
    procedimento = models.ForeignKey(Procedimento, on_delete=models.CASCADE, related_name='valores_convenio')
    plano_convenio = models.ForeignKey(PlanoConvenio, on_delete=models.CASCADE, related_name='valores_procedimento')
    valor = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Valor Acordado (R$)")

    def __str__(self):
        return f"{self.procedimento.descricao} | {self.plano_convenio.nome}: R$ {self.valor}"

    class Meta:
        # Garante que não teremos duas entradas de preço para a mesma combinação
        unique_together = ('procedimento', 'plano_convenio')
        verbose_name = "Valor de Procedimento por Convênio"
        verbose_name_plural = "Valores de Procedimentos por Convênios"