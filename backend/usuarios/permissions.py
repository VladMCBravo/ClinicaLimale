from rest_framework.permissions import BasePermission
from pacientes.models import Paciente # Precisamos importar o Paciente

class IsAdminOrMedico(BasePermission):
    """
    Permissão customizada para permitir acesso apenas a administradores ou médicos.
    """
    def has_permission(self, request, view):
        # O usuário precisa estar autenticado
        if not request.user or not request.user.is_authenticated:
            return False
        # O usuário precisa ter o cargo 'admin' ou 'medico'
        return request.user.cargo in ['admin', 'medico']

# --- ADICIONE A NOVA CLASSE ABAIXO ---

class IsMedicoResponsavelOrAdmin(BasePermission):
    """
    Permissão que verifica se o usuário é superuser, admin ou o médico responsável.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusuários e Admins sempre têm permissão
        if request.user.is_superuser or request.user.cargo == 'admin':
            return True

        # Médicos precisam ser o responsável pelo paciente
        if request.user.cargo == 'medico':
            paciente_id = view.kwargs.get('paciente_id')
            if not paciente_id:
                return False

            try:
                paciente = Paciente.objects.get(pk=paciente_id)
                return paciente.medico_responsavel == request.user
            except Paciente.DoesNotExist:
                return False

        # Outros cargos são bloqueados
        return False

class IsRecepcaoOrAdmin(BasePermission):
    """
    Permissão customizada para permitir acesso apenas a administradores ou recepção.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.cargo in ['admin', 'recepcao']