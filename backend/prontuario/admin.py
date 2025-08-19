from django.contrib import admin
from .models import Evolucao, Prescricao, ItemPrescricao, Anamnese, Atestado

# Permite ver os itens de medicamento dentro da própria prescrição
class ItemPrescricaoInline(admin.TabularInline):
    model = ItemPrescricao
    extra = 1 # Quantos campos de item extra mostrar

class PrescricaoAdmin(admin.ModelAdmin):
    inlines = [ItemPrescricaoInline]
    list_display = ('paciente', 'medico', 'data_prescricao')

# Registra todos os modelos para que apareçam no admin
admin.site.register(Evolucao)
admin.site.register(Prescricao, PrescricaoAdmin)
admin.site.register(Anamnese)
admin.site.register(Atestado)