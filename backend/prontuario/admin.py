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
    # AnamneseGinecologica, # Descomente se existirem
    # AnamneseOrtopedia,
    AnamneseCardiologia,
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
    fields = ('medicamento', 'dosagem', 'frequencia', 'duracao')

class MarcoDNPMInline(admin.TabularInline):
    model = MarcoDNPM
    extra = 0
    can_delete = False
    readonly_fields = ('marco_descricao', 'idade_marco', 'alcançado')
    # Ideal para ver o desenvolvimento dentro do Paciente, se fizer a relação inversa no futuro

# --- Admin Classes ---

@admin.register(Evolucao)
class EvolucaoAdmin(admin.ModelAdmin):
    list_display = ('id', 'paciente_link', 'medico', 'data_atendimento', 'resumo_texto')
    list_filter = ('medico', 'data_atendimento')
    search_fields = ('paciente__nome_completo', 'texto')
    
    def paciente_link(self, obj):
        if obj.paciente:
            return format_html('<a href="/admin/pacientes/paciente/{}/change/">{}</a>', obj.paciente.id, obj.paciente.nome_completo)
        return "-"
    paciente_link.short_description = "Paciente"

    def resumo_texto(self, obj):
        return obj.texto[:50] + "..." if obj.texto else "-"
    resumo_texto.short_description = "Início da Evolução"

@admin.register(Prescricao)
class PrescricaoAdmin(admin.ModelAdmin):
    inlines = [ItemPrescricaoInline]
    list_display = ('id', 'paciente', 'medico', 'data_prescricao', 'qtd_itens')
    list_filter = ('medico', 'data_prescricao')
    search_fields = ('paciente__nome_completo',)

    def qtd_itens(self, obj):
        return obj.itens_prescricao.count() # Ajuste 'itens_prescricao' para o related_name correto se der erro
    qtd_itens.short_description = "Qtd. Medicamentos"

@admin.register(Anamnese)
class AnamneseAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'medico', 'tipo_anamnese', 'data_criacao')
    list_filter = ('medico', 'data_criacao')
    search_fields = ('paciente__nome_completo', 'queixa_principal')
    
    def tipo_anamnese(self, obj):
        # Tenta identificar se tem especialidade atrelada
        if hasattr(obj, 'pediatria'): return "Pediatria"
        if hasattr(obj, 'cardiologia'): return "Cardiologia"
        return "Geral"

@admin.register(Atestado)
class AtestadoAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'medico', 'tipo_atestado', 'dias_afastamento', 'data_emissao')
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
    list_display = ('paciente', 'marco_descricao', 'idade_marco', 'alcançado', 'data_registro')
    list_filter = ('alcançado', 'idade_marco')
    search_fields = ('paciente__nome_completo', 'marco_descricao')

@admin.register(VacinaPaciente)
class VacinaPacienteAdmin(admin.ModelAdmin):
    # vacina_id mostra o ID numérico, nome_vacina mostra o texto
    list_display = ('paciente', 'vacina_id', 'nome_vacina', 'dose', 'status', 'data_aplicacao')
    list_filter = ('status', 'nome_vacina')
    search_fields = ('paciente__nome_completo',)

@admin.register(AnamnesePediatria)
class AnamnesePediatriaAdmin(admin.ModelAdmin):
     list_display = ('anamnese', 'parto_tipo', 'idade_gestacional')
     search_fields = ('anamnese__paciente__nome_completo',)

# --- Relatórios e Templates ---

@admin.register(TemplateRelatorio)
class TemplateRelatorioAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'especialidade', 'ativo')
    list_filter = ('especialidade', 'ativo')
    search_fields = ('titulo', 'conteudo')
    
    # Campo de texto grande para facilitar edição
    formfield_overrides = {
        models.TextField: {'widget': Textarea(attrs={'rows': 30, 'cols': 90})},
    }

@admin.register(RelatorioSalvo)
class RelatorioSalvoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'paciente', 'medico', 'data_criacao')
    readonly_fields = ('conteudo_final',)