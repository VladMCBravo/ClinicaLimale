# backend/agendamentos/apps.py

from django.apps import AppConfig

class AgendamentosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'agendamentos'

    # Adicione apenas este bloco:
    def ready(self):
        import agendamentos.signals