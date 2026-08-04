# prontuario/apps.py
from django.apps import AppConfig


class ProntuarioConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'prontuario'

    def ready(self):
        import prontuario.signals  # noqa