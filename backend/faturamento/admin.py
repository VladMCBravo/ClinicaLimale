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
    # 1. Define as colunas exatas que aparecerão na tabela
    list_display = ('id', 'get_paciente', 'get_data_agendamento', 'descricao', 'valor', 'status')
    
    # 2. Adiciona filtros na barra lateral direita
    list_filter = ('status',)
    
    # 3. Adiciona uma barra de pesquisa (busca por nome do paciente ou descrição)
    search_fields = ('paciente__nome_completo', 'descricao')
    
    # 4. Melhora a performance ao carregar itens relacionados
    raw_id_fields = ('paciente', 'agendamento')

    # Métodos personalizados para puxar dados dos relacionamentos (Paciente e Agendamento)
    def get_paciente(self, obj):
        return obj.paciente.nome_completo if obj.paciente else "Sem paciente vinculado"
    get_paciente.short_description = 'Paciente'

    def get_data_agendamento(self, obj):
        if getattr(obj, 'agendamento', None) and obj.agendamento.data_hora_inicio:
            # Formata a data e hora para ficar bonito na tabela
            return obj.agendamento.data_hora_inicio.strftime('%d/%m/%Y %H:%M')
        return "Sem agendamento"
    get_data_agendamento.short_description = 'Data do Agendamento'
    
    # 3. Novo método para buscar o nome de quem gerou o pagamento
    def get_registrado_por(self, obj):
        if obj.registrado_por:
            # Tenta pegar o nome completo (ex: "Vladmir Bravo"). Se não tiver, pega o login (username)
            return obj.registrado_por.get_full_name() or obj.registrado_por.username
        # Se for vazio, significa que foi gerado automaticamente pelo bot ou cronjob
        return "Sistema / Bot"
    get_registrado_por.short_description = 'Registrado por'

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