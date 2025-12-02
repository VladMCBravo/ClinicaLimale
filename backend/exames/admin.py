from django.contrib import admin
from .models import Exame, ArquivoExame

class ArquivoExameInline(admin.TabularInline):
    """Mostra os arquivos (fotos/vídeos) dentro da tela do Exame"""
    model = ArquivoExame
    extra = 0
    readonly_fields = ['arquivo_link']

    def arquivo_link(self, obj):
        if obj.arquivo:
            return obj.arquivo.url
        return "-"

@admin.register(Exame)
class ExameAdmin(admin.ModelAdmin):
    # O que aparece na lista geral
    list_display = ('id', 'paciente_nome', 'data_exame', 'codigo_acesso', 'senha_acesso', 'status')
    
    # Campos que você pode pesquisar
    search_fields = ('paciente__nome_completo', 'codigo_acesso', 'nome_paciente_pasta')
    
    # Filtros laterais
    list_filter = ('status', 'data_exame')
    
    # Adiciona a lista de arquivos dentro do exame
    inlines = [ArquivoExameInline]

    # Helper para mostrar o nome do paciente mesmo se estiver nulo
    def paciente_nome(self, obj):
        if obj.paciente:
            return obj.paciente.nome_completo
        return f"{obj.nome_paciente_pasta} (Não vinculado)"
    paciente_nome.short_description = "Paciente"

@admin.register(ArquivoExame)
class ArquivoExameAdmin(admin.ModelAdmin):
    list_display = ('id', 'exame', 'tipo', 'criado_em')