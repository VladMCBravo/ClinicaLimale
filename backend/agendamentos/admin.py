from django.contrib import admin
from .models import Agendamento

# Criamos uma classe para personalizar como os Agendamentos são exibidos
class AgendamentoAdmin(admin.ModelAdmin):
    # 1. Colunas na Lista: Define as colunas que aparecerão na listagem
    list_display = (
        'id',  # ID do agendamento
        'paciente',
        'get_data_formatada', # Usaremos uma função para formatar a data
        'get_hora_inicio',    # E outra para a hora
        'tipo_consulta',
        'status',
    )

    # 2. Filtros: Adiciona uma barra lateral com filtros
    list_filter = ('status', 'data_hora_inicio')

    # 3. Busca: Adiciona um campo de busca
    # O '__' permite buscar em campos de modelos relacionados (ForeignKey)
    search_fields = ('paciente__nome_completo', 'paciente__cpf')

    # Funções para formatar a data e a hora na listagem
    def get_data_formatada(self, obj):
        # Converte a hora para o fuso local e formata
        return obj.data_hora_inicio.astimezone().strftime('%d/%m/%Y')
    get_data_formatada.admin_order_field = 'data_hora_inicio' # Permite ordenar por esta coluna
    get_data_formatada.short_description = 'Data' # Nome da coluna no admin

    def get_hora_inicio(self, obj):
        # Converte a hora para o fuso local e formata
        return obj.data_hora_inicio.astimezone().strftime('%H:%M')
    get_hora_inicio.admin_order_field = 'data_hora_inicio' # Permite ordenar por esta coluna
    get_hora_inicio.short_description = 'Horário' # Nome da coluna no admin


# Registra o modelo Agendamento junto com a sua classe de personalização
admin.site.register(Agendamento, AgendamentoAdmin)