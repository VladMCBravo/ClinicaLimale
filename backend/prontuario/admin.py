# backend/prontuario/admin.py - VERSÃO CORRIGIDA E MODERNIZADA

from django.contrib import admin
from django.db import models
from django.forms import Textarea
from .models import (
    Evolucao, 
    Prescricao, 
    ItemPrescricao, 
    Anamnese, 
    Atestado,
    DocumentoPaciente,  # <-- Modelo importado
    OpcaoClinica,
    # --- ADIÇÕES DE IMPORTAÇÃO ---
    AnamnesePediatria,
    AnamneseGinecologica,
    AnamneseOrtopedia,
    AnamneseCardiologia,
    AnamneseNeonatologia,
    MarcoDNPM,
    VacinaPaciente,
    TemplateRelatorio, RelatorioSalvo
    # --- FIM DAS ADIÇÕES ---
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

# --- INÍCIO DAS NOVAS ADIÇÕES ---

# Registrando os novos modelos longitudinais
@admin.register(MarcoDNPM)
class MarcoDNPMAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'marco_descricao', 'alcançado', 'data_registro')
    list_filter = ('alcançado', 'idade_marco')
    search_fields = ('paciente__nome_completo', 'marco_descricao')

@admin.register(VacinaPaciente)
class VacinaPacienteAdmin(admin.ModelAdmin):
    list_display = ('paciente', 
                    'vacina_id', # ★★★ ADICIONE ESTA LINHA ★★★
                    'nome_vacina', 'dose', 'status', 'data_aplicacao')
    list_filter = ('status', 'nome_vacina')
    search_fields = ('paciente__nome_completo',)

# Registrando as anamneses de especialidade (opcional, mas recomendado)
@admin.register(AnamnesePediatria)
class AnamnesePediatriaAdmin(admin.ModelAdmin):
     list_display = ('anamnese',)
     search_fields = ('anamnese__paciente__nome_completo',)

# (Você pode descomentar o @admin.register acima e adicionar para as outras especialidades)

# --- FIM DAS NOVAS ADIÇÕES ---
# --- Opcional, mas RECOMENDADO ---
# Isso cria um painel de admin melhor para os Templates,
# com uma caixa de texto GRANDE para o conteúdo.
class TemplateRelatorioAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'especialidade')
    list_filter = ('especialidade',)
    search_fields = ('titulo', 'conteudo')

    # Isso faz a mágica de aumentar a caixa de texto
    formfield_overrides = {
        models.TextField: {'widget': Textarea(attrs={'rows': 30, 'cols': 90})},
    }

# --- REGISTRO ---
# Registra o Template (com o painel melhorado)
admin.site.register(TemplateRelatorio, TemplateRelatorioAdmin)

# Registra os Relatórios Salvos (só para podermos vê-los)
admin.site.register(RelatorioSalvo)