# backend/usuarios/permissions.py - VERSÃO CORRIGIDA E EXPANDIDA
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

# PERMISSÃO CORRIGIDA: Agora é mais flexível
class IsMedicoResponsavelOrAdmin(permissions.BasePermission):
    """
    Permissão que verifica se o usuário é admin ou o médico responsável pelo paciente.
    Funciona para prontuários e detalhes do paciente.
    """
    def has_object_permission(self, request, view, obj):
        # Admins sempre têm permissão
        if request.user.cargo == 'admin':
            return True
        # Se o usuário for médico, verifica se ele é o responsável pelo objeto (paciente)
        if request.user.cargo == 'medico':
            return obj.medico_responsavel == request.user
        return False