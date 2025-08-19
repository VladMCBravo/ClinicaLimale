# backend/usuarios/permissions.py - VERSÃO CORRIGIDA

from rest_framework import permissions
from pacientes.models import Paciente

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.cargo == 'admin'

class IsRecepcaoUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.cargo == 'recepcao'

class IsMedicoUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.cargo == 'medico'

# --- CLASSE QUE ESTAVA FALTANDO ---
class IsRecepcaoOrAdmin(permissions.BasePermission):
    """
    Permissão customizada para permitir acesso apenas a administradores ou recepção.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.cargo in ['admin', 'recepcao']

class IsMedicoResponsavelOrAdmin(permissions.BasePermission):
    """
    Permissão que verifica se o usuário é admin ou o médico responsável pelo paciente.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.cargo == 'admin':
            return True
        if request.user.cargo == 'medico':
            # Assumindo que o objeto 'obj' é uma instância de Paciente ou tem um campo 'paciente'
            paciente = obj if isinstance(obj, Paciente) else getattr(obj, 'paciente', None)
            if paciente:
                return paciente.medico_responsavel == request.user
        return False