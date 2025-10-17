# backend/usuarios/permissions.py - VERSÃO CORRIGIDA

from rest_framework import permissions
from pacientes.models import Paciente
from rest_framework.permissions import BasePermission, SAFE_METHODS

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
    Permissão customizada que permite acesso a prontuários.
    - has_permission: Garante que apenas médicos e admins possam acessar as listas.
    - has_object_permission: Garante que apenas o médico que criou o registro,
      o médico responsável pelo paciente ou um admin possam ver os detalhes.
    """

    def has_permission(self, request, view):
        """
        Verificação a nível de view (para listas como /evolucoes/).
        Permite o acesso se o usuário for um Admin ou um Médico autenticado.
        """
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Se for admin ou médico, tem permissão para ver a lista de evoluções/anamnese.
        return request.user.cargo in ['admin', 'medico']

    def has_object_permission(self, request, view, obj):
        """
        Verificação a nível de objeto (para detalhes como /evolucoes/1/).
        'obj' é a instância da Evolucao, Anamnese, etc.
        """
        # Admins sempre têm permissão
        if request.user.cargo == 'admin':
            return True

        # Verificação 1: O usuário logado é o médico que criou este registro?
        if hasattr(obj, 'medico') and obj.medico == request.user:
            return True

        # Verificação 2: O usuário logado é o médico responsável pelo paciente deste registro?
        if hasattr(obj, 'paciente') and hasattr(obj.paciente, 'medico_responsavel'):
            if obj.paciente.medico_responsavel == request.user:
                return True
        
        return False

class AllowRead_WriteRecepcaoAdmin(BasePermission):
    """
    Permissão customizada que:
    - Permite leitura (GET, HEAD, OPTIONS) para qualquer usuário autenticado.
    - Permite escrita (POST, PUT, PATCH, DELETE) APENAS para usuários
      com cargo 'recepcao' ou 'admin'.
    """
    def has_permission(self, request, view):
        # Primeiro, garante que o usuário está logado.
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Se o método da requisição for um método seguro (GET), permite o acesso.
        if request.method in SAFE_METHODS:
            return True
            
        # Se for um método de escrita (POST, PUT, etc.), verifica o cargo.
        return request.user.cargo in ['admin', 'recepcao']