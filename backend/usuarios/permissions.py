# backend/usuarios/permissions.py - VERSÃO FINAL E ESTÁVEL

from rest_framework import permissions
from rest_framework.permissions import BasePermission, SAFE_METHODS
from pacientes.models import Paciente # Importe o Paciente para a permissão original

# --- PERMISSÕES ORIGINAIS RESTAURADAS PARA GARANTIR A ESTABILIDADE ---

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.cargo == 'admin'

class IsRecepcaoUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.cargo == 'recepcao'

class IsMedicoUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.cargo == 'medico'

class IsRecepcaoOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.cargo in ['admin', 'recepcao']

# ESTA CLASSE FOI RESTAURADA PARA NÃO QUEBRAR OUTROS APPS (COMO 'pacientes')
class IsMedicoResponsavelOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.cargo == 'admin':
            return True
        if request.user.cargo == 'medico':
            paciente = None
            if isinstance(obj, Paciente):
                paciente = obj
            elif hasattr(obj, 'paciente'):
                paciente = obj.paciente
            
            if paciente:
                return paciente.medico_responsavel == request.user
        return False

# ESTA CLASSE FOI RESTAURADA PARA NÃO QUEBRAR OUTROS APPS (COMO 'pacientes')
class AllowRead_WriteRecepcaoAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.cargo in ['admin', 'recepcao']

# --- NOVA PERMISSÃO, SEGURA E ESPECÍFICA APENAS PARA O PRONTUÁRIO (LGPD) ---

class CanViewProntuario(permissions.BasePermission):
    """
    Permissão restrita para prontuários. Acesso permitido APENAS para 'medico'.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.cargo == 'medico'

    def has_object_permission(self, request, view, obj):
        """
        Permite que um médico veja o detalhe do histórico para garantir a continuidade
        do cuidado do paciente. A verificação de cargo já foi feita.
        """
        return request.user.cargo == 'medico'