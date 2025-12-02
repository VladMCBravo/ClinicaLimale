from django.contrib import admin
from django.urls import path
from django.shortcuts import redirect
from .models import Clinica

@admin.register(Clinica)
class ClinicaAdmin(admin.ModelAdmin):
    """
    Admin para o modelo singleton Clinica.
    Redireciona a 'changelist' para a única instância existente.
    """

    def get_urls(self):
        urls = super().get_urls()
        # Sobrescreve a URL da lista para redirecionar para a edição
        custom_urls = [
            path('', self.admin_site.admin_view(self.redirect_to_singleton), name='core_clinica_changelist')
        ]
        return custom_urls + urls

    def redirect_to_singleton(self, request):
        # Garante que existe uma instância e redireciona para ela
        obj = Clinica.get_instance()
        return redirect('admin:core_clinica_change', obj.id)

    def has_add_permission(self, request):
        # Impede a criação de novas instâncias se uma já existir
        return not Clinica.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Impede a exclusão da instância singleton
        return False