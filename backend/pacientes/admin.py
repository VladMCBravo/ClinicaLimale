from django.contrib import admin
from .models import Paciente

# Vamos criar uma classe para personalizar a página de administração de Pacientes
class PacienteAdmin(admin.ModelAdmin):
    # Lista de campos que queremos que apareçam na visualização inicial
    list_display = ('nome_completo', 'telefone_celular', 'cidade', 'data_cadastro', 'medico_responsavel')
    # Adiciona uma barra de busca
    search_fields = ('nome_completo', 'cpf', 'cidade')
# --- NOVA SEÇÃO ---
    # Organiza o formulário de criação/edição em seções (fieldsets)
    # É aqui que garantimos que o campo apareça
    fieldsets = (
        ('Dados Pessoais', {
            'fields': ('nome_completo', 'data_nascimento', 'cpf', 'genero')
        }),
        ('Contato', {
            'fields': ('telefone_celular', 'email', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado')
        }),
        ('Convênio', {
            'fields': ('convenio', 'numero_carteirinha', 'plano_convenio'),
            'classes': ('collapse',) # Deixa esta seção "recolhível"
        }),
        ('Atribuição Interna', {
            'fields': ('medico_responsavel',) # <--- NOSSO NOVO CAMPO ESTÁ AQUI
        }),
    )

    # A "mágica" acontece aqui:
    # Dizemos ao Django para incluir nosso arquivo JavaScript nesta página.
    class Media:
        js = ('pacientes/js/cep_autofill.js',)

# Registra o modelo Paciente junto com a sua classe de personalização
admin.site.register(Paciente, PacienteAdmin)