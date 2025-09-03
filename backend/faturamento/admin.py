# backend/faturamento/admin.py

from django.contrib import admin
# 1. Importe TODOS os modelos que vamos usar, incluindo o novo
from .models import (
    Pagamento, CategoriaDespesa, Despesa, 
    Convenio, PlanoConvenio, Procedimento, ValorProcedimentoConvenio
)

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

# Registros que não mudaram
admin.site.register(Pagamento)
admin.site.register(CategoriaDespesa)
admin.site.register(Despesa)
admin.site.register(Convenio)

# 6. Removemos os registros antigos e usamos os novos, customizados
admin.site.register(PlanoConvenio, PlanoConvenioAdmin)
admin.site.register(Procedimento, ProcedimentoAdmin)

# 7. O modelo ValorProcedimentoConvenio não precisa ser registrado separadamente
# porque ele já é gerenciado pelo Inline dentro de Procedimento.