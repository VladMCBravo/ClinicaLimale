# Em: backend/agendamentos/admin.py - VERSÃO FINAL CORRIGIDA E UNIFICADA

from django.contrib import admin
from .models import Agendamento, Sala
from django.utils import timezone

@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    # --- LISTA PRINCIPAL (COMBINANDO O MELHOR DAS DUAS VERSÕES) ---
    list_display = (
        'paciente',
        'data_formatada',
        'horario_formatado',
        'tipo_agendamento',
        'medico',
        'sala',  # <-- Adicionado da segunda versão
        'status',
    )
    
    # --- FILTROS E BUSCA (COMBINANDO O MELHOR DAS DUAS VERSÕES) ---
    list_filter = ('status', 'tipo_agendamento', 'medico', 'sala', 'data_hora_inicio') # <-- Adicionado 'sala'
    search_fields = ('paciente__nome_completo', 'medico__first_name', 'medico__last_name')

    # --- FORMULÁRIO DE EDIÇÃO (ORGANIZADO E COM O CAMPO 'SALA') ---
    fieldsets = (
        ('Informações Principais', {
            'fields': (
                'paciente',
                'sala', # <-- Adicionado o campo 'sala' aqui para edição
                'status',
                'data_hora_inicio',
                'data_hora_fim'
            )
        }),
        ('Classificação do Agendamento', {
            'fields': (
                'tipo_agendamento',
                'medico',
                'especialidade',
                'procedimento',
            )
        }),
        ('Detalhes do Atendimento', {
            'fields': (
                'tipo_atendimento',
                'plano_utilizado',
                'modalidade',
                'tipo_visita',
                'observacoes',
            )
        }),
        ('Telemedicina (Opcional)', {
            'fields': ('link_telemedicina', 'id_sala_telemedicina'),
            'classes': ('collapse',) # Deixa esta seção recolhida
        }),
    )
    
    readonly_fields = ('link_telemedicina', 'id_sala_telemedicina')

    # --- MÉTODOS PERSONALIZADOS PARA A LISTA ---
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

# --- Registro do modelo Sala (correto e mantido) ---
@admin.register(Sala)
class SalaAdmin(admin.ModelAdmin):
    list_display = ('id', 'nome')
    search_fields = ('nome',)

# A segunda definição de AgendamentoAdmin foi REMOVIDA para corrigir o erro.