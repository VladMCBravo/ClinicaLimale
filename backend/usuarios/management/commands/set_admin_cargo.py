# backend/usuarios/management/commands/set_admin_cargo.py
from django.core.management.base import BaseCommand
from usuarios.models import CustomUser

class Command(BaseCommand):
    help = 'Define o cargo de um usuário como admin'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='O nome de usuário do admin')

    def handle(self, *args, **kwargs):
        username = kwargs['username']
        try:
            user = CustomUser.objects.get(username=username)
            user.cargo = 'admin'
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Cargo do usuário '{username}' definido como 'admin' com sucesso!"))
        except CustomUser.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Usuário '{username}' não encontrado."))