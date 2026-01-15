from django.contrib import admin
from django.utils.html import format_html
from .models import Laudo, ModeloLaudo

@admin.register(ModeloLaudo)
class ModeloLaudoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'codigo_mnemonico', 'ativo')
    search_fields = ('titulo', 'codigo_mnemonico', 'conteudo_rico')
    list_filter = ('ativo',)
    fieldsets = (
        (None, {
            'fields': ('titulo', 'codigo_mnemonico', 'ativo')
        }),
        ('Conteúdo do Modelo', {
            'fields': ('conteudo_rico',), # Assume que é o campo de texto grande
            'classes': ('wide',),
        }),
    )

@admin.register(Laudo)
class LaudoAdmin(admin.ModelAdmin):
    list_display = (
        'id', 
        'titulo_exame', 
        'paciente_link',  # Link clicável
        'medico', 
        'status_badge',   # Status colorido
        'tem_credenciais', # Ícone se tem senha
        'data_criacao'
    )
    
    list_filter = ('status', 'medico', 'data_criacao')
    search_fields = ('titulo_exame', 'paciente__nome_completo', 'medico__nome_completo', 'codigo_acesso')
    autocomplete_fields = ['paciente', 'medico']
    readonly_fields = ('data_criacao', 'data_atualizacao', 'codigo_acesso', 'senha_acesso')

    fieldsets = (
        ('Dados Principais', {
            'fields': ('titulo_exame', 'paciente', 'medico', 'agendamento', 'status')
        }),
        ('Acesso do Paciente', {
            'fields': ('codigo_acesso', 'senha_acesso'),
            'description': 'Credenciais geradas automaticamente quando o status é FINALIZADO.'
        }),
        ('Conteúdo Técnico', {
            'fields': ('dados_estruturados', 'texto_laudo', 'imagens_ids'),
            'classes': ('collapse',), # Esconde para não poluir a tela inicial
        }),
        ('Metadados', {
            'fields': ('data_criacao', 'data_atualizacao')
        }),
    )

    # --- Helpers Visuais ---

    def paciente_link(self, obj):
        if obj.paciente:
            return format_html('<a href="/admin/pacientes/paciente/{}/change/">{}</a>', obj.paciente.id, obj.paciente.nome_completo)
        return "-"
    paciente_link.short_description = "Paciente"

    def status_badge(self, obj):
        color = 'green' if obj.status == 'FINALIZADO' else ('orange' if obj.status == 'RASCUNHO' else 'red')
        return format_html(
            '<span style="color:white; background-color:{}; padding:3px 8px; border-radius:3px;">{}</span>',
            color, obj.status
        )
    status_badge.short_description = "Status"

    def tem_credenciais(self, obj):
        if obj.codigo_acesso and obj.senha_acesso:
            return format_html('<span style="color:green;">✔ Gerado</span>')
        return format_html('<span style="color:#ccc;">-</span>')
    tem_credenciais.short_description = "Acesso Portal"