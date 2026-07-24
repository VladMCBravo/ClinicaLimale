# backend/pacientes/admin.py - VERSÃO COM RESGATE DE PACIENTES

from django.contrib import admin
from .models import Paciente

@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    # 1. Mostra o status visualmente na lista
    list_display = ('nome_completo', 'cpf', 'telefone_celular', 'plano_convenio', 'ativo')
    
    # 2. Permite filtrar para ver apenas os "apagados" (ativo=False)
    list_filter = ('ativo', 'plano_convenio__convenio', 'data_cadastro')
    
    search_fields = ('nome_completo', 'cpf')
    
    fieldsets = (
        ('Informações Pessoais', {
            'fields': ('nome_completo', 'data_nascimento', 'cpf', 'genero')
        }),
        ('Informações de Contato', {
            'fields': ('telefone_celular', 'email', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado')
        }),
        ('Dados do Convênio', {
            'fields': ('plano_convenio', 'numero_carteirinha')
        }),
        ('Outras Informações', {
            # 3. Permite marcar/desmarcar na edição manual
            'fields': ('medico_responsavel', 'ativo')
        }),
    )

    raw_id_fields = ('plano_convenio', 'medico_responsavel')

    # 4. A MÁGICA: Ação em lote para ressuscitar pacientes apagados acidentalmente
    actions = ['restaurar_pacientes_apagados']

    @admin.action(description='🟢 Restaurar Pacientes Selecionados')
    def restaurar_pacientes_apagados(self, request, queryset):
        # Atualiza todos os pacientes selecionados de volta para ativo=True
        queryset.update(ativo=True)
        self.message_user(request, "Os pacientes foram restaurados e voltarão a aparecer no sistema!")