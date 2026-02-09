import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

# ==============================================================================
# 1. MODELO UNIFICADO (O NOVO "CORAÇÃO" DO FINANCEIRO)
# ==============================================================================
class TransacaoFinanceira(models.Model):
    # Tipos e Status
    TIPO_CHOICES = [('Receita', 'Receita'), ('Despesa', 'Despesa')]
    
    STATUS_CHOICES = [
        ('Pendente', 'Pendente'),
        ('Pago', 'Pago'),
        ('Atrasado', 'Atrasado'),
        ('Cancelado', 'Cancelado'),
        ('Renegociado', 'Renegociado'), # Feature Nova
        ('Liquidado', 'Liquidado'),     # Feature Nova (Pai de múltiplos pagamentos)
    ]

    FORMA_PAGAMENTO_CHOICES = [
        ('Dinheiro', 'Dinheiro'),
        ('PIX', 'PIX'),
        ('CartaoCredito', 'Cartão de Crédito'),
        ('CartaoDebito', 'Cartão de Débito'),
        ('Transferencia', 'Transferência Bancária'),
        ('Boleto', 'Boleto'),
        # --- ADICIONADOS QUE FALTAVAM ---
        ('Convenio', 'Convênio'),
        ('MaquinaCartao', 'Máquina de Cartão'),
        ('Outro', 'Outro'),
    ]

    # Identificação
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    descricao = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pendente')
    
    # Valores e Datas
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    valor_original = models.DecimalField(max_digits=12, decimal_places=2, help_text="Valor original antes de juros/multa", null=True, blank=True)
    
    data_vencimento = models.DateField(null=True, blank=True)
    data_pagamento = models.DateField(null=True, blank=True) # Data da baixa efetiva
    data_competencia = models.DateField(default=timezone.now, help_text="Data do fato gerador (ex: data da consulta)")
    
    # Detalhes do Pagamento
    forma_pagamento = models.CharField(max_length=50, choices=FORMA_PAGAMENTO_CHOICES, blank=True, null=True)
    numero_parcela = models.IntegerField(default=1)
    qtd_parcelas = models.IntegerField(default=1)
    
    # Vínculos (Quem gerou isso?)
    paciente = models.ForeignKey('pacientes.Paciente', on_delete=models.SET_NULL, null=True, blank=True, related_name='financeiro_unificado')
    agendamento = models.ForeignKey('agendamentos.Agendamento', on_delete=models.SET_NULL, null=True, blank=True, related_name='financeiro_unificado')
    categoria = models.ForeignKey('CategoriaDespesa', on_delete=models.PROTECT, null=True, blank=True)
    
    # RASTREABILIDADE (Hierarquia para Split Payment e Renegociação)
    transacao_pai = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='filhas')

    # Integrações (PIX / Link / Inter)
    inter_txid = models.CharField(max_length=50, blank=True, null=True, unique=True)
    pix_copia_e_cola = models.TextField(blank=True, null=True)
    pix_qr_code_base64 = models.TextField(blank=True, null=True)
    pix_expira_em = models.DateTimeField(blank=True, null=True)
    link_pagamento = models.URLField(max_length=500, blank=True, null=True)

    observacoes = models.TextField(blank=True, null=True)
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.descricao} | {self.get_status_display()} | R$ {self.valor}"

    class Meta:
        ordering = ['-data_vencimento']
        indexes = [
            models.Index(fields=['status', 'data_vencimento']),
            models.Index(fields=['paciente']),
        ]

# ==============================================================================
# 2. MODELS LEGADOS (Mantidos para compatibilidade temporária)
# ==============================================================================

class Pagamento(models.Model):
    # Cópia exata das opções do seu modelo original
    FORMA_PAGAMENTO_CHOICES = [
        ('Dinheiro', 'Dinheiro'),
        ('CartaoCredito', 'Cartão de Crédito'),
        ('CartaoDebito', 'Cartão de Débito'),
        ('PIX', 'PIX'),
        ('Convenio', 'Convênio'),
        ('MaquinaCartao', 'Máquina de Cartão'),
        ('Transferencia', 'Transferência Bancária'),
        ('Boleto', 'Boleto'),
        ('Outro', 'Outro'),
    ]
    STATUS_PAGAMENTO_CHOICES = [
        ('Pendente', 'Pendente'),
        ('Pago', 'Pago'),
        ('Cancelado', 'Cancelado'),
        ('Expirado', 'Expirado'),
        ('Renegociado', 'Renegociado'),
    ]
    
    agendamento = models.OneToOneField(
        'agendamentos.Agendamento',
        on_delete=models.SET_NULL, 
        related_name='pagamento', # OBRIGATÓRIO SER 'pagamento' PARA NÃO QUEBRAR O FRONT
        null=True, blank=True
    )
    paciente = models.ForeignKey('pacientes.Paciente', on_delete=models.PROTECT, null=True, blank=True)
    descricao = models.CharField(max_length=255, blank=True, null=True)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    forma_pagamento = models.CharField(max_length=20, choices=FORMA_PAGAMENTO_CHOICES, blank=True, null=True)
    data_pagamento = models.DateTimeField(blank=True, null=True)
    data_vencimento = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_PAGAMENTO_CHOICES, default='Pendente')
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True) # Null=True para facilitar migração

    # Campos PIX Legados
    inter_txid = models.CharField(max_length=50, blank=True, null=True, unique=True)
    pix_copia_e_cola = models.TextField(blank=True, null=True)
    pix_qr_code_base64 = models.TextField(blank=True, null=True)
    pix_expira_em = models.DateTimeField(blank=True, null=True)
    link_pagamento = models.URLField(max_length=500, blank=True, null=True)
    
    # REMOVIDO VÍNCULO DIRETO COM TRANSACAO_PAI PARA EVITAR COMPLEXIDADE AGORA
    # numero_parcela = models.IntegerField(default=1)

    def __str__(self):
        return f"Pagamento Legado: {self.valor} ({self.status})"

class CategoriaDespesa(models.Model):
    TIPO_CHOICES = [('Fixa', 'Fixa (Estrutura/Recorrente)'), ('Variavel', 'Variável (Consumo/Eventual)')]
    nome = models.CharField(max_length=100, unique=True)
    descricao = models.TextField(blank=True, null=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='Variavel')

    def __str__(self): return f"{self.nome} ({self.get_tipo_display()})"
    class Meta: ordering = ['nome']

class Despesa(models.Model):
    # Adicione as opções de pagamento aqui também (ou reutilize se preferir)
    FORMA_PAGAMENTO_CHOICES = [
        ('Dinheiro', 'Dinheiro'),
        ('PIX', 'PIX'),
        ('CartaoCredito', 'Cartão de Crédito'),
        ('CartaoDebito', 'Cartão de Débito'),
        ('Transferencia', 'Transferência Bancária'),
        ('Boleto', 'Boleto'),
        ('Outro', 'Outro'),
    ]
    categoria = models.ForeignKey(CategoriaDespesa, on_delete=models.PROTECT, related_name='despesas')
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    data_despesa = models.DateField()
    data_vencimento = models.DateField(null=True, blank=True)
    pago = models.BooleanField(default=False)
    data_pagamento = models.DateField(null=True, blank=True)
    forma_pagamento = models.CharField(max_length=50, choices=FORMA_PAGAMENTO_CHOICES, blank=True, null=True)
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    data_registro = models.DateTimeField(auto_now_add=True)
    
    def __str__(self): return f"{self.descricao} - R$ {self.valor}"
    class Meta: ordering = ['-data_despesa']

# ==============================================================================
# 3. MODELS DE CONVÊNIO E TISS (Mantidos intactos)
# ==============================================================================

class Convenio(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    ativo = models.BooleanField(default=True)
    class Meta: ordering = ['nome']
    def __str__(self): return self.nome

class PlanoConvenio(models.Model):
    convenio = models.ForeignKey(Convenio, on_delete=models.CASCADE, related_name='planos')
    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True, null=True)
    ativo = models.BooleanField(default=True)
    class Meta:
        ordering = ['convenio__nome', 'nome']
        unique_together = ('convenio', 'nome')
    def __str__(self): return f"{self.convenio.nome} - {self.nome}"

class LoteFaturamento(models.Model):
    STATUS_LOTE_CHOICES = [('Aberto', 'Em Aberto'), ('Enviado', 'Enviado'), ('Pago', 'Pago'), ('Pago com Glosa', 'Pago com Glosa'), ('Recusado', 'Recusado')]
    convenio = models.ForeignKey(Convenio, on_delete=models.PROTECT, related_name='lotes')
    mes_referencia = models.DateField()
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_envio = models.DateTimeField(null=True, blank=True)
    valor_total_lote = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_LOTE_CHOICES, default='Aberto')
    gerado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    def __str__(self): return f"Lote {self.id} - {self.convenio.nome}"
    class Meta: ordering = ['-mes_referencia']

class GuiaTiss(models.Model):
    lote = models.ForeignKey(LoteFaturamento, on_delete=models.CASCADE, related_name='guias')
    agendamento = models.OneToOneField('agendamentos.Agendamento', on_delete=models.PROTECT, related_name='guia_tiss')
    valor_guia = models.DecimalField(max_digits=10, decimal_places=2)
    status_guia = models.CharField(max_length=100, default="Enviada")
    data_criacao = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"Guia {self.id}"

class Procedimento(models.Model):
    CATEGORIA_CHOICES = [
        ('US_GERAL', 'Ultrassonografia Geral'),
        ('MED_FETAL', 'Medicina Fetal'),
        ('ECOCARDIOGRAMA', 'Ecocardiograma'),
        ('MUSCULO', 'Musculoesquelético'),
        ('DOPPLER', 'Doppler Vascular'),
        ('OUTROS', 'Outros'),
    ]
    codigo_tuss = models.CharField(max_length=20, blank=True, null=True) 
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='OUTROS')
    descricao = models.CharField(max_length=255)
    descricao_detalhada = models.TextField(blank=True)
    valor_particular = models.DecimalField(max_digits=10, decimal_places=2)
    ativo = models.BooleanField(default=True)

    def __str__(self): return f"{self.codigo_tuss or 'S/C'} - {self.descricao}"
    class Meta: ordering = ['categoria', 'descricao']

class ValorProcedimentoConvenio(models.Model):
    procedimento = models.ForeignKey(Procedimento, on_delete=models.CASCADE, related_name='valores_convenio')
    plano_convenio = models.ForeignKey(PlanoConvenio, on_delete=models.CASCADE, related_name='valores_procedimento')
    valor = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('procedimento', 'plano_convenio')
        verbose_name = "Valor de Procedimento por Convênio"