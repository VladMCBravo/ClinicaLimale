# backend/laudos/admin.py
from django.contrib import admin
from .models import Laudo, ModeloLaudo

@admin.register(ModeloLaudo)
class ModeloLaudoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'codigo_mnemonico', 'ativo')
    search_fields = ('titulo', 'codigo_mnemonico')
    list_filter = ('ativo',)
    # Removido 'especialidade' pois não existe no novo model

@admin.register(Laudo)
class LaudoAdmin(admin.ModelAdmin):
    # Atualizado de 'medico_executante' para 'medico'
    list_display = ('titulo_exame', 'paciente', 'medico', 'status', 'data_criacao')
    
    # Atualizado de 'medico_executante' para 'medico'
    list_filter = ('status', 'medico', 'data_criacao')
    
    search_fields = ('titulo_exame', 'paciente__nome_completo', 'medico__nome_completo')
    
    # Atualizado: removido 'hash_assinatura' e adicionado 'medico'
    autocomplete_fields = ['paciente', 'medico']
    
    # Removido 'hash_assinatura' pois simplificamos o model inicial
    readonly_fields = ('data_criacao', 'data_atualizacao')

    fieldsets = (
        ('Dados Principais', {
            'fields': ('titulo_exame', 'paciente', 'medico', 'agendamento', 'status')
        }),
        ('Conteúdo', {
            'fields': ('dados_estruturados', 'texto_laudo', 'imagens_ids')
        }),
        ('Metadados', {
            'fields': ('data_criacao', 'data_atualizacao')
        }),
    )