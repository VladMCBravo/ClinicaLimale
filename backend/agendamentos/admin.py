# Em: backend/agendamentos/admin.py - VERSÃO FINAL REFINADA

from django.contrib import admin
from .models import Agendamento
from django.utils import timezone

@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'paciente',
        'data_formatada',
        'horario_formatado',
        'modalidade', # <-- Ótimo para ver rapidamente na lista
        'status',
        'link_telemedicina', # <-- Adicionado aqui para fácil visualização
    )
    list_filter = ('status', 'modalidade', 'tipo_atendimento')
    search_fields = ('paciente__nome_completo',)

    fieldsets = (
        ('Informações Principais', {
            'fields': ('paciente', 'status', 'procedimento', 'tipo_consulta')
        }),
        ('Datas e Horários', {
            'fields': ('data_hora_inicio', 'data_hora_fim')
        }),
        ('Detalhes do Atendimento', {
            # 1. ADICIONAMOS OS CAMPOS DE TELEMEDICINA AQUI
            'fields': (
                'tipo_atendimento', 
                'plano_utilizado', 
                'modalidade', 
                'tipo_visita', 
                'observacoes',
                'link_telemedicina',
                'id_sala_telemedicina'
            )
        }),
    )
    
    # 2. TORNAMOS OS CAMPOS GERADOS AUTOMATICAMENTE "SOMENTE LEITURA"
    readonly_fields = ('link_telemedicina', 'id_sala_telemedicina')

    # ... (o resto dos seus métodos como data_formatada, etc.) ...
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