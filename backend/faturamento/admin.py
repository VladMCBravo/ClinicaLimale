# backend/faturamento/admin.py

from django.contrib import admin
# 1. Importe TODOS os modelos que vamos usar, incluindo o novo
from .models import (
    Pagamento, CategoriaDespesa, Despesa, 
    Convenio, PlanoConvenio, Procedimento, ValorProcedimentoConvenio,
    LoteFaturamento, GuiaTiss
)

# --- INÍCIO DA NOVA CONFIGURAÇÃO DE PAGAMENTOS ---
class PagamentoAdmin(admin.ModelAdmin):
    # 1. Adicionamos as colunas visuais aqui
    list_display = ('id', 'get_paciente', 'descricao', 'valor', 'status', 'get_registrado_por', 'get_auditoria_baixa')
    
    list_filter = ('status', 'data_pagamento')
    search_fields = ('paciente__nome_completo', 'descricao')
    raw_id_fields = ('paciente', 'agendamento', 'baixado_por', 'registrado_por')

    def get_paciente(self, obj):
        return obj.paciente.nome_completo if obj.paciente else "Sem paciente"
    get_paciente.short_description = 'Paciente'

    def get_registrado_por(self, obj):
        if obj.registrado_por:
            return obj.registrado_por.get_full_name() or obj.registrado_por.username
        return "Sistema / Bot"
    get_registrado_por.short_description = 'Gerado por'

    # 2. Nova coluna de Auditoria da Baixa
    def get_auditoria_baixa(self, obj):
        if obj.status != 'Pago':
            return "-"
            
        # Se foi o banco Inter
        if obj.inter_txid:
            return "Bot (Inter)"
            
        if obj.baixado_por:
            nome = obj.baixado_por.get_full_name() or obj.baixado_por.username
            data = obj.data_hora_baixa.strftime('%d/%m %H:%M') if obj.data_hora_baixa else "?"
            return f"{nome} ({data})"
            
        # Se nasceu pago pelo frontend avulso
        return "Nasceu Pago / Sem registro"
        
    get_auditoria_baixa.short_description = 'Baixado por (Auditoria)'

# --- FIM DA NOVA CONFIGURAÇÃO DE PAGAMENTOS ---

# 2. Crie uma classe "Inline" para a tabela de preços
# Isso diz ao Django: "mostre os 'Valores de Procedimento' dentro do admin de 'Procedimento'"
class ValorProcedimentoConvenioInline(admin.TabularInline):
    model = ValorProcedimentoConvenio
    extra = 1 # Quantos campos em branco para adicionar novos preços aparecem por padrão
    autocomplete_fields = ['plano_convenio'] # Facilita a busca por planos


# 3. Crie uma classe de Admin customizada para o Procedimento
class ProcedimentoAdmin(admin.ModelAdmin):
    list_display = ('codigo_tuss', 'descricao', 'valor_particular', 'ativo')
    search_fields = ('codigo_tuss', 'descricao')
    list_filter = ('ativo',)
    # 4. A mágica acontece aqui: conectamos o Inline ao Admin do Procedimento
    inlines = [ValorProcedimentoConvenioInline]

# 5. Para o autocomplete_fields funcionar, o admin de PlanoConvenio precisa ter search_fields
class PlanoConvenioAdmin(admin.ModelAdmin):
    search_fields = ['nome', 'convenio__nome']
    list_display = ('nome', 'convenio', 'ativo')
    list_filter = ('convenio', 'ativo')

# --- REGISTROS FINAIS ---

# Registros antigos
admin.site.register(CategoriaDespesa)
admin.site.register(Despesa)
admin.site.register(Convenio)
admin.site.register(LoteFaturamento)
admin.site.register(GuiaTiss)

# Registros Customizados
admin.site.register(PlanoConvenio, PlanoConvenioAdmin)
admin.site.register(Procedimento, ProcedimentoAdmin)

# Substituímos o registro simples pelo novo registro com a classe PagamentoAdmin
admin.site.register(Pagamento, PagamentoAdmin)

# 7. O modelo ValorProcedimentoConvenio não precisa ser registrado separadamente
# porque ele já é gerenciado pelo Inline dentro de Procedimento.