from django.contrib import admin
from .models import ModeloLaudo, Laudo

@admin.register(ModeloLaudo)
class ModeloLaudoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'codigo_procedimento', 'especialidade', 'ativo')
    search_fields = ('titulo', 'codigo_procedimento')

@admin.register(Laudo)
class LaudoAdmin(admin.ModelAdmin):
    list_display = ('titulo_exame', 'paciente', 'medico', 'status', 'data_criacao')
    list_filter = ('status', 'data_criacao', 'medico')
    search_fields = ('paciente__nome_completo', 'titulo_exame')