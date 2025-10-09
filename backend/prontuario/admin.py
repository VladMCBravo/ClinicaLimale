# backend/prontuario/admin.py - VERSÃO CORRIGIDA E MODERNIZADA

from django.contrib import admin
from .models import (
    Evolucao, 
    Prescricao, 
    ItemPrescricao, 
    Anamnese, 
    Atestado,
    DocumentoPaciente,  # <-- Modelo importado
    OpcaoClinica        # <-- Modelo importado
)

# --- Configurações Específicas ---

# Permite ver os itens de medicamento dentro da própria prescrição (mantido)
class ItemPrescricaoInline(admin.TabularInline):
    model = ItemPrescricao
    extra = 1 # Quantos campos de item extra mostrar

# --- Registros dos Modelos usando @admin.register (prática moderna) ---

@admin.register(Evolucao)
class EvolucaoAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'medico', 'data_atendimento')
    list_filter = ('medico', 'data_atendimento')
    search_fields = ('paciente__nome_completo',)

@admin.register(Prescricao)
class PrescricaoAdmin(admin.ModelAdmin):
    inlines = [ItemPrescricaoInline]
    list_display = ('paciente', 'medico', 'data_prescricao')
    list_filter = ('medico', 'data_prescricao')
    search_fields = ('paciente__nome_completo',)

@admin.register(Anamnese)
class AnamneseAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'medico', 'data_criacao')
    search_fields = ('paciente__nome_completo',)

@admin.register(Atestado)
class AtestadoAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'medico', 'data_emissao', 'tipo_atestado')
    list_filter = ('tipo_atestado', 'medico')
    search_fields = ('paciente__nome_completo',)

# <<-- NOVO: REGISTRO DO MODELO DE DOCUMENTOS -->>
@admin.register(DocumentoPaciente)
class DocumentoPacienteAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'titulo', 'enviado_por', 'data_upload')
    list_filter = ('enviado_por', 'data_upload')
    search_fields = ('paciente__nome_completo', 'titulo')

# <<-- NOVO: REGISTRO DO MODELO DE OPÇÕES CLÍNICAS -->>
@admin.register(OpcaoClinica)
class OpcaoClinicaAdmin(admin.ModelAdmin):
    list_display = ('descricao', 'especialidade', 'area_clinica')
    list_filter = ('especialidade', 'area_clinica')
    search_fields = ('descricao',)