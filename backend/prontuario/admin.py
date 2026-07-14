from django.contrib import admin
from django.db import models
from django.forms import Textarea
from django.utils.html import format_html

# Importação Centralizada de TODOS os Models
from .models import (
    Evolucao, 
    Prescricao, 
    ItemPrescricao,
    ModeloPrescricao,     # Adicionado: Prescrições salvas (Modelos)
    Anamnese, 
    Atestado,
    DocumentoPaciente,
    OpcaoClinica,
    AnamneseClinicaGeral, # Adicionado
    AnamneseGinecologica, # Adicionado
    AnamneseOrtopedia,    # Adicionado
    AnamneseCardiologia,  # Adicionado
    AnamnesePediatria,
    AnamneseNeonatologia, # Adicionado
    MarcoDNPM,
    VacinaPaciente,
    TemplateRelatorio, 
    RelatorioSalvo,
    Laudo,
    ModeloLaudo,          # Adicionado: Templates de laudo
    ImagemLaudo           # Adicionado: Imagens do laudo
)

# =========================================================
# INLINES (Formulários aninhados para exibir itens filhos)
# =========================================================

class ItemPrescricaoInline(admin.TabularInline):
    model = ItemPrescricao
    extra = 0
    # CORREÇÃO: Usando os campos reais do models.py (medicamento, via, dosagem, instrucoes)
    fields = ('medicamento', 'via', 'dosagem', 'instrucoes')

class ImagemLaudoInline(admin.TabularInline):
    model = ImagemLaudo
    extra = 0
    readonly_fields = ('data_upload', 'miniatura')
    fields = ('arquivo', 'miniatura', 'data_upload')

    def miniatura(self, obj):
        if obj.arquivo:
            return format_html('<img src="{}" style="height: 50px; border-radius: 5px;" />', obj.arquivo.url)
        return "-"
    miniatura.short_description = "Visualização"

class MarcoDNPMInline(admin.TabularInline):
    model = MarcoDNPM
    extra = 0
    can_delete = False
    readonly_fields = ('marco_descricao', 'idade_marco', 'alcançado', 'data_registro')

# --- Inlines de Especialidades para a Anamnese ---
# Isso permite ver os dados específicos de cada área dentro da Anamnese principal

class AnamneseClinicaGeralInline(admin.StackedInline):
    model = AnamneseClinicaGeral
    extra = 0

class AnamnesePediatriaInline(admin.StackedInline):
    model = AnamnesePediatria
    extra = 0

class AnamneseGinecologicaInline(admin.StackedInline):
    model = AnamneseGinecologica
    extra = 0

class AnamneseCardiologiaInline(admin.StackedInline):
    model = AnamneseCardiologia
    extra = 0

class AnamneseOrtopediaInline(admin.StackedInline):
    model = AnamneseOrtopedia
    extra = 0

class AnamneseNeonatologiaInline(admin.StackedInline):
    model = AnamneseNeonatologia
    extra = 0


# =========================================================
# ADMIN CLASSES (Configuração das telas de listagem)
# =========================================================

@admin.register(Evolucao)
class EvolucaoAdmin(admin.ModelAdmin):
    # Auditoria Clara: Mostra O QUE (cid/especialidade), QUEM (medico), PARA QUEM (paciente) e QUANDO
    list_display = ('id', 'paciente_link', 'medico', 'especialidade', 'cid', 'data_atendimento')
    list_filter = ('especialidade', 'medico', 'data_atendimento')
    search_fields = ('paciente__nome_completo', 'medico__first_name', 'medico__username', 'cid')
    readonly_fields = ('data_atendimento',)
    
    def paciente_link(self, obj):
        if obj.paciente:
            return format_html('<a href="/admin/pacientes/paciente/{}/change/">{}</a>', obj.paciente.id, obj.paciente.nome_completo)
        return "-"
    paciente_link.short_description = "Paciente"

@admin.register(Prescricao)
class PrescricaoAdmin(admin.ModelAdmin):
    inlines = [ItemPrescricaoInline]
    list_display = ('id', 'titulo', 'paciente', 'medico', 'data_prescricao')
    list_filter = ('medico', 'data_prescricao')
    search_fields = ('paciente__nome_completo', 'titulo', 'medico__first_name')
    readonly_fields = ('data_prescricao',)

@admin.register(ModeloPrescricao)
class ModeloPrescricaoAdmin(admin.ModelAdmin):
    # Atendendo ao seu pedido: Visualização das Prescrições Salvas/Modelos
    list_display = ('titulo', 'medico', 'data_criacao')
    list_filter = ('medico',)
    search_fields = ('titulo', 'medico__first_name', 'medico__username')
    readonly_fields = ('data_criacao',)

@admin.register(Atestado)
class AtestadoAdmin(admin.ModelAdmin):
    # Atendendo ao seu pedido: Visualização clara de Afastamento x Comparecimento e CID
    list_display = ('id', 'paciente', 'tipo_atestado', 'cid', 'medico', 'data_emissao')
    list_filter = ('tipo_atestado', 'medico', 'data_emissao')
    search_fields = ('paciente__nome_completo', 'cid', 'medico__first_name')
    readonly_fields = ('data_emissao',)

@admin.register(Anamnese)
class AnamneseAdmin(admin.ModelAdmin):
    # Centraliza o Prontuário Base + Inlines das especialidades
    inlines = [
        AnamneseClinicaGeralInline,
        AnamnesePediatriaInline, 
        AnamneseGinecologicaInline, 
        AnamneseCardiologiaInline,
        AnamneseOrtopediaInline,
        AnamneseNeonatologiaInline
    ]
    list_display = ('id', 'paciente', 'medico', 'data_atualizacao', 'data_criacao')
    list_filter = ('medico', 'data_atualizacao')
    search_fields = ('paciente__nome_completo', 'queixa_principal', 'medico__first_name')
    readonly_fields = ('data_criacao', 'data_atualizacao')

@admin.register(DocumentoPaciente)
class DocumentoPacienteAdmin(admin.ModelAdmin):
    # Auditoria de Uploads
    list_display = ('id', 'titulo', 'paciente', 'enviado_por', 'arquivo_link', 'data_upload')
    list_filter = ('enviado_por', 'data_upload')
    search_fields = ('paciente__nome_completo', 'titulo')
    readonly_fields = ('data_upload',)

    def arquivo_link(self, obj):
        if obj.arquivo:
            return format_html('<a href="{}" target="_blank">Abrir Documento</a>', obj.arquivo.url)
        return "-"
    arquivo_link.short_description = "Arquivo"

@admin.register(OpcaoClinica)
class OpcaoClinicaAdmin(admin.ModelAdmin):
    list_display = ('descricao', 'area_clinica', 'especialidade')
    list_filter = ('especialidade', 'area_clinica')
    search_fields = ('descricao',)
    ordering = ('especialidade', 'area_clinica', 'descricao')

# =========================================================
# DNPM E VACINAS
# =========================================================

@admin.register(MarcoDNPM)
class MarcoDNPMAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'marco_descricao', 'idade_marco', 'alcançado', 'medico', 'data_registro')
    list_filter = ('alcançado', 'idade_marco', 'medico') 
    search_fields = ('paciente__nome_completo', 'marco_descricao')
    readonly_fields = ('data_registro',)

@admin.register(VacinaPaciente)
class VacinaPacienteAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'nome_vacina', 'dose', 'status', 'data_aplicacao')
    list_filter = ('status', 'nome_vacina', 'idade_recomendada')
    search_fields = ('paciente__nome_completo', 'nome_vacina')

# =========================================================
# RELATÓRIOS E LAUDOS
# =========================================================

@admin.register(TemplateRelatorio)
class TemplateRelatorioAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'especialidade', 'medico_criador')
    list_filter = ('especialidade',)
    search_fields = ('titulo', 'conteudo')
    
    formfield_overrides = {
        models.TextField: {'widget': Textarea(attrs={'rows': 20, 'cols': 100})},
    }

@admin.register(RelatorioSalvo)
class RelatorioSalvoAdmin(admin.ModelAdmin):
    # Auditoria de Relatórios Gerados
    list_display = ('id', 'titulo', 'paciente', 'cid', 'medico', 'data_criacao')
    list_filter = ('medico', 'data_criacao')
    search_fields = ('paciente__nome_completo', 'titulo', 'cid')
    readonly_fields = ('data_criacao',)

@admin.register(ModeloLaudo)
class ModeloLaudoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'codigo_mnemonico', 'ativo')
    list_filter = ('ativo',)
    search_fields = ('titulo', 'codigo_mnemonico')

@admin.register(Laudo)
class LaudoAdmin(admin.ModelAdmin):
    inlines = [ImagemLaudoInline]
    # Auditoria Total de Laudos
    list_display = ('id', 'titulo_exame', 'paciente', 'medico', 'status', 'codigo_acesso', 'data_criacao')
    search_fields = ('paciente__nome_completo', 'codigo_acesso', 'titulo_exame', 'medico__first_name')
    list_filter = ('status', 'tipo_exame', 'medico', 'data_criacao')
    readonly_fields = ('data_criacao', 'data_atualizacao', 'codigo_acesso', 'senha_acesso')
    
    fieldsets = (
        ('Informações Principais', {
            'fields': ('paciente', 'medico', 'agendamento', 'exame', 'titulo_exame', 'tipo_exame', 'status')
        }),
        ('Conteúdo do Laudo', {
            'fields': ('texto_laudo', 'dados_estruturados', 'arquivo_pdf')
        }),
        ('Auditoria e Credenciais', {
            'fields': ('medico_responsavel', 'crm_medico', 'codigo_acesso', 'senha_acesso', 'data_criacao', 'data_atualizacao'),
            'classes': ('collapse',)
        }),
    )