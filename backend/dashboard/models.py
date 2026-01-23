# backend/dashboard/models.py
from django.db import models

class MetaMensal(models.Model):
    """
    Define o alvo para o Painel Executivo comparar (Realizado vs Meta).
    Essencial para as barras de progresso e cálculo de CAC.
    """
    mes_referencia = models.DateField(help_text="Dia 1 do mês de referência")
    
    # Inputs Financeiros (Para calcular CAC e Margem)
    investimento_marketing = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total investido em Ads/Mkt no mês")
    custos_fixos_estimados = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Metas (Para as barras de progresso)
    meta_faturamento = models.DecimalField(max_digits=12, decimal_places=2)
    meta_novos_ciclos = models.IntegerField(default=50)
    meta_conversao = models.DecimalField(max_digits=5, decimal_places=2, default=20.00, help_text="Em %")

    class Meta:
        unique_together = ('mes_referencia',)
        verbose_name = "Meta e Investimento Mensal"

    def __str__(self):
        return f"Metas de {self.mes_referencia.strftime('%m/%Y')}"
    
class SnapshotDiario(models.Model):
    """
    Foto diária da empresa para gerar os gráficos de linha (evolução).
    """
    data = models.DateField(auto_now_add=True, unique=True)
    
    # Funil
    total_entradas = models.IntegerField(default=0) # F1
    total_agendados = models.IntegerField(default=0) # F2
    total_compareceram = models.IntegerField(default=0) # F3
    total_retencao = models.IntegerField(default=0) # F4
    
    # Financeiro
    receita_do_dia = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    ticket_medio_dia = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Risco
    pacientes_em_risco = models.IntegerField(default=0, help_text="Qtd de pacientes com atraso na jornada")

    class Meta:
        ordering = ['-data']