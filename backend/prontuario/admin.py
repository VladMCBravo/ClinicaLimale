from django.contrib import admin
from django.db import models
from django.forms import Textarea
from django.utils.html import format_html

# Importação Centralizada dos Models
from .models import (
    Evolucao, 
    Prescricao, 
    ItemPrescricao, 
    Anamnese, 
    Atestado,
    DocumentoPaciente,
    OpcaoClinica,
    AnamnesePediatria,
    # AnamneseGinecologica,
    # AnamneseOrtopedia,
    # AnamneseCardiologia,
    # AnamneseNeonatologia,
    MarcoDNPM,
    VacinaPaciente,
    TemplateRelatorio, 
    RelatorioSalvo
)

# --- Inlines (Mostra itens dentro do pai) ---

class ItemPrescricaoInline(admin.TabularInline):
    model = ItemPrescricao
    extra = 0
    # Ajuste os campos abaixo apenas se existirem no model ItemPrescricao
    # Caso dê erro novamente, comente a linha 'fields'
    fields = ('medicamento', 'dosagem', 'frequencia', 'duracao')

class MarcoDNPMInline(admin.TabularInline):
    model = MarcoDNPM
    extra = 0
    can_delete = False
    # Removido 'alcançado' caso não exista, mantendo o básico
    readonly_fields = ('marco_descricao', 'idade_marco')

# --- Admin Classes ---

@admin.register(Evolucao)
class EvolucaoAdmin(admin.ModelAdmin):
    # Removido 'resumo_texto' para evitar erros de atributo, focando no básico seguro
    list_display = ('id', 'paciente_link', 'medico', 'data_atendimento')
    list_filter = ('medico', 'data_atendimento')
    search_fields = ('paciente__nome_completo',)
    
    def paciente_link(self, obj):
        if obj.paciente:
            return format_html('<a href="/admin/pacientes/paciente/{}/change/">{}</a>', obj.paciente.id, obj.paciente.nome_completo)
        return "-"
    paciente_link.short_description = "Paciente"

@admin.register(Prescricao)
class PrescricaoAdmin(admin.ModelAdmin):
    inlines = [ItemPrescricaoInline]
    list_display = ('id', 'paciente', 'medico', 'data_prescricao')
    list_filter = ('medico', 'data_prescricao')
    search_fields = ('paciente__nome_completo',)

@admin.register(Anamnese)
class AnamneseAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'medico', 'tipo_anamnese', 'data_criacao')
    list_filter = ('medico', 'data_criacao')
    search_fields = ('paciente__nome_completo', 'queixa_principal')
    
    def tipo_anamnese(self, obj):
        if hasattr(obj, 'pediatria'): return "Pediatria"
        return "Geral"

@admin.register(Atestado)
class AtestadoAdmin(admin.ModelAdmin):
    # CORREÇÃO: Removido 'dias_afastamento' que causou erro
    list_display = ('paciente', 'medico', 'tipo_atestado', 'data_emissao')
    list_filter = ('tipo_atestado', 'medico', 'data_emissao')
    search_fields = ('paciente__nome_completo',)

@admin.register(DocumentoPaciente)
class DocumentoPacienteAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'titulo', 'enviado_por', 'arquivo_link', 'data_upload')
    list_filter = ('enviado_por', 'data_upload')
    search_fields = ('paciente__nome_completo', 'titulo')

    def arquivo_link(self, obj):
        if obj.arquivo:
            return format_html('<a href="{}" target="_blank">Abrir</a>', obj.arquivo.url)
        return "-"
    arquivo_link.short_description = "Arquivo"

@admin.register(OpcaoClinica)
class OpcaoClinicaAdmin(admin.ModelAdmin):
    list_display = ('descricao', 'area_clinica', 'especialidade')
    list_filter = ('area_clinica', 'especialidade')
    search_fields = ('descricao',)
    ordering = ('area_clinica', 'descricao')

# --- Especialidades e Vacinas ---

@admin.register(MarcoDNPM)
class MarcoDNPMAdmin(admin.ModelAdmin):
    # Removido 'alcançado' para garantir deploy seguro
    list_display = ('paciente', 'marco_descricao', 'idade_marco', 'data_registro')
    list_filter = ('idade_marco',) 
    search_fields = ('paciente__nome_completo', 'marco_descricao')

@admin.register(VacinaPaciente)
class VacinaPacienteAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'vacina_id', 'nome_vacina', 'dose', 'status', 'data_aplicacao')
    list_filter = ('status', 'nome_vacina')
    search_fields = ('paciente__nome_completo',)

@admin.register(AnamnesePediatria)
class AnamnesePediatriaAdmin(admin.ModelAdmin):
     # CORREÇÃO: Removido 'parto_tipo' que causou erro
     list_display = ('anamnese',)
     search_fields = ('anamnese__paciente__nome_completo',)

# --- Relatórios e Templates ---

@admin.register(TemplateRelatorio)
class TemplateRelatorioAdmin(admin.ModelAdmin):
    # CORREÇÃO: Removido 'ativo' que causou erro
    list_display = ('titulo', 'especialidade')
    list_filter = ('especialidade',)
    search_fields = ('titulo', 'conteudo')
    
    formfield_overrides = {
        models.TextField: {'widget': Textarea(attrs={'rows': 30, 'cols': 90})},
    }

@admin.register(RelatorioSalvo)
class RelatorioSalvoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'paciente', 'medico', 'data_criacao')
    readonly_fields = ('conteudo_final',)