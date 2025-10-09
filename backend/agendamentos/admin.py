# Em: backend/agendamentos/admin.py - VERSÃO FINAL E CORRIGIDA

from django.contrib import admin
from .models import Agendamento, Sala # <-- 1. IMPORTE O MODELO 'Sala'
from django.utils import timezone

@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    # --- LISTA PRINCIPAL (MELHORADA) ---
    list_display = (
        'paciente',
        'data_formatada',
        'horario_formatado',
        'tipo_agendamento', # <-- NOVO
        'medico',           # <-- NOVO
        'status',
    )
    # --- FILTROS E BUSCA (MELHORADOS) ---
    list_filter = ('status', 'tipo_agendamento', 'medico', 'data_hora_inicio')
    search_fields = ('paciente__nome_completo', 'medico__first_name', 'medico__last_name')

    # --- FORMULÁRIO DE EDIÇÃO (CORRIGIDO E REORGANIZADO) ---
    fieldsets = (
        ('Informações Principais', {
            'fields': (
                'paciente', 
                'status', 
                'data_hora_inicio', 
                'data_hora_fim'
            )
        }),
        # --- NOVA SEÇÃO PARA A LÓGICA PRINCIPAL ---
        ('Classificação do Agendamento', {
            'fields': (
                'tipo_agendamento', # Removido 'tipo_consulta' e adicionado este
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
    
    # Seus campos somente leitura continuam aqui
    readonly_fields = ('link_telemedicina', 'id_sala_telemedicina')

    # --- SEUS MÉTODOS PERSONALIZADOS (MANTIDOS) ---
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

    # Classe para customizar a exibição de Agendamentos (provavelmente já existe)
@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'data_hora_inicio', 'status', 'sala', 'medico')
    list_filter = ('status', 'sala', 'medico')
    search_fields = ('paciente__nome_completo',)

# <<-- 2. ADICIONE ESTE BLOCO PARA REGISTRAR AS SALAS -->>
@admin.register(Sala)
class SalaAdmin(admin.ModelAdmin):
    list_display = ('id', 'nome')
    search_fields = ('nome',)