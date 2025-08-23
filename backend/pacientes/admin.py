# backend/pacientes/admin.py - VERSÃO FINAL E CORRIGIDA

from django.contrib import admin
from .models import Paciente

@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    # Campos que aparecerão na lista de pacientes
    list_display = ('nome_completo', 'cpf', 'telefone_celular', 'plano_convenio')
    
    # Adiciona filtros úteis
    list_filter = ('plano_convenio__convenio', 'data_cadastro')
    
    # Permite a busca por nome ou CPF
    search_fields = ('nome_completo', 'cpf')
    
    # --- A CORREÇÃO PRINCIPAL ESTÁ AQUI ---
    # Organizamos a página de edição em seções (fieldsets)
    # e removemos a referência ao campo antigo 'convenio'
    fieldsets = (
        ('Informações Pessoais', {
            'fields': ('nome_completo', 'data_nascimento', 'cpf', 'genero')
        }),
        ('Informações de Contato', {
            'fields': ('telefone_celular', 'email', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado')
        }),
        # Usamos os novos campos corretos aqui
        ('Dados do Convênio', {
            'fields': ('plano_convenio', 'numero_carteirinha')
        }),
        ('Outras Informações', {
            'fields': ('medico_responsavel',)
        }),
    )

    # Para melhorar a performance, usamos raw_id_fields para ForeignKeys com muitos itens
    raw_id_fields = ('plano_convenio', 'medico_responsavel')