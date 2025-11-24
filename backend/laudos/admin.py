# backend/laudos/admin.py

from django.contrib import admin
from .models import ModeloLaudo, Laudo

@admin.register(ModeloLaudo)
class ModeloLaudoAdmin(admin.ModelAdmin):
    # CORREÇÃO: 'codigo_procedimento' mudou para 'codigo_mnemonico'
    list_display = ('titulo', 'codigo_mnemonico', 'especialidade', 'ativo')
    search_fields = ('titulo', 'codigo_mnemonico')
    list_filter = ('especialidade', 'ativo')

@admin.register(Laudo)
class LaudoAdmin(admin.ModelAdmin):
    # CORREÇÃO: 'medico' mudou para 'medico_executante'
    list_display = ('paciente', 'titulo_exame', 'medico_executante', 'status', 'data_criacao')
    
    # CORREÇÃO: Filtros também precisam usar o nome correto do campo
    list_filter = ('status', 'medico_executante', 'data_criacao')
    
    search_fields = ('paciente__nome_completo', 'titulo_exame', 'texto_puro')
    readonly_fields = ('data_criacao', 'data_atualizacao', 'hash_assinatura')
    
    # Dica: Raw ID fields ajuda se você tiver muitos pacientes
    autocomplete_fields = ['paciente', 'medico_executante']