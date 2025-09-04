# backend/agendamentos/admin.py

from django.contrib import admin
from .models import Agendamento
from django.utils import timezone # Importe o timezone

# Esta é a classe de configuração para o Admin
@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    # Campos que aparecerão na LISTA de agendamentos
    list_display = (
        'id',
        'paciente',
        'data_formatada', # Usaremos um método para formatar a data
        'horario_formatado', # E o horário
        'tipo_consulta',
        'status',
        'plano_utilizado', # <-- NOSSOS CAMPOS IMPORTANTES!
        'modalidade', # <-- NOVO
        'tipo_visita',  # <-- NOVO
        'tipo_atendimento' # <-- O campo que vamos criar
    )
    
    list_filter = ('status', 'modalidade', 'tipo_atendimento') # <-- Adicione modalidade ao filtro
    search_fields = ('paciente__nome_completo',)

    fieldsets = (
        ('Informações Principais', {
            'fields': ('paciente', 'status', 'procedimento', 'tipo_consulta')
        }),
        ('Datas e Horários', {
            'fields': ('data_hora_inicio', 'data_hora_fim')
        }),
        ('Detalhes do Atendimento', {
            'fields': ('tipo_atendimento', 'plano_utilizado', 'modalidade', 'tipo_visita', 'observacoes') # <-- ADICIONADOS AQUI
        }),
        ('Outras Informações', {
            'fields': ('observacoes',)
        }),
    )

    # Métodos para formatar a data e hora na lista
    def data_formatada(self, obj):
        if obj.data_hora_inicio:
            return timezone.localtime(obj.data_hora_inicio).strftime('%d/%m/%Y')
        return "N/A"
    data_formatada.admin_order_field = 'data_hora_inicio'
    data_formatada.short_description = 'Data'

    def horario_formatado(self, obj):
        if obj.data_hora_inicio:
            return timezone.localtime(obj.data_hora_inicio).strftime('%H:%M')
        return "N/A"
    horario_formatado.admin_order_field = 'data_hora_inicio'
    horario_formatado.short_description = 'Horário'