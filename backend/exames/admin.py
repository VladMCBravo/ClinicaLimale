from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import Exame, ArquivoExame

# --- Inline para ver os arquivos dentro do Exame ---
class ArquivoExameInline(admin.TabularInline):
    model = ArquivoExame
    extra = 0
    fields = ('visualizacao', 'tipo', 'criado_em', 'arquivo')
    readonly_fields = ('visualizacao', 'criado_em')

    def visualizacao(self, obj):
        if obj.arquivo:
            # Mostra link clicável para abrir o arquivo
            return format_html('<a href="{}" target="_blank">Abrir Arquivo</a>', obj.arquivo.url)
        return "-"
    visualizacao.short_description = "Ver"

# --- Admin Principal de Exames ---
@admin.register(Exame)
class ExameAdmin(admin.ModelAdmin):
    list_display = (
        'id', 
        'status_badge', 
        'paciente_link', 
        'nome_paciente_pasta', 
        'data_exame', 
        'qtd_arquivos',  # <--- O SEGREDO PARA DESCOBRIR O ERRO
        'criado_em'
    )
    
    # Filtros laterais para achar o problema
    list_filter = (
        'status', 
        ('paciente', admin.RelatedOnlyFieldListFilter), # Filtra só pacientes que têm exames
        'data_exame', 
        'criado_em' # Fundamental para ver se foram criados todos no mesmo minuto
    )
    
    search_fields = (
        'paciente__nome_completo', 
        'codigo_acesso', 
        'nome_paciente_pasta'
    )
    
    inlines = [ArquivoExameInline]
    
    # Organiza a tela de edição
    fieldsets = (
        ('Identificação', {
            'fields': ('paciente', 'nome_paciente_pasta', 'data_exame', 'status')
        }),
        ('Acesso do Paciente', {
            'fields': ('codigo_acesso', 'senha_acesso'),
            'description': 'Credenciais geradas automaticamente para o portal.'
        }),
    )

    # Otimização de consulta (evita lentidão com 4000 registros)
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Conta os arquivos de cada exame para exibir na lista
        return qs.annotate(arquivos_count=Count('arquivos'))

    # Coluna customizada: Quantidade de Arquivos
    def qtd_arquivos(self, obj):
        count = obj.arquivos_count
        if count == 0:
            return format_html('<span style="color:red; font-weight:bold;">0 (Vazio)</span>')
        return count
    qtd_arquivos.short_description = "Qtd. Arq."
    qtd_arquivos.admin_order_field = 'arquivos_count'

    # Coluna customizada: Status Colorido
    def status_badge(self, obj):
        color = 'green' if obj.status == 'DISPONIVEL' else 'orange'
        return format_html(
            '<span style="color:white; background-color:{}; padding:3px 8px; border-radius:3px;">{}</span>',
            color, obj.status
        )
    status_badge.short_description = "Status"

    # Coluna customizada: Link para o Paciente
    def paciente_link(self, obj):
        if obj.paciente:
            return format_html('<a href="/admin/pacientes/paciente/{}/change/">{}</a>', obj.paciente.id, obj.paciente.nome_completo)
        return "-"
    paciente_link.short_description = "Paciente Vinculado"

# --- Admin Secundário: Arquivos Soltos ---
@admin.register(ArquivoExame)
class ArquivoExameAdmin(admin.ModelAdmin):
    list_display = ('id', 'link_exame', 'tipo', 'criado_em')
    list_filter = ('tipo', 'criado_em')

    def link_exame(self, obj):
        return format_html('<a href="/admin/exames/exame/{}/change/">Exame #{}</a>', obj.exame.id, obj.exame.id)
    link_exame.short_description = "Pertence ao Exame"