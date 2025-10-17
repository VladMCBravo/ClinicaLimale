# backend/usuarios/permissions.py - VERSÃO CORRIGIDA

from rest_framework import permissions
from pacientes.models import Paciente
from rest_framework.permissions import BasePermission, SAFE_METHODS

# --- PERMISSÕES BÁSICAS POR CARGO (RESTAURADAS) ---

class IsAdminUser(permissions.BasePermission):
    """ Permite acesso apenas para usuários com cargo 'admin'. """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.cargo == 'admin'

class IsRecepcaoUser(permissions.BasePermission):
    """ Permite acesso apenas para usuários com cargo 'recepcao'. """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.cargo == 'recepcao'

class IsMedicoUser(permissions.BasePermission):
    """ Perme acesso apenas para usuários com cargo 'medico'. """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.cargo == 'medico'

class IsRecepcaoOrAdmin(permissions.BasePermission):
    """ Permite acesso para 'admin' ou 'recepcao'. """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.cargo in ['admin', 'recepcao']

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

# ▼▼▼ USE ESTA VERSÃO CORRETA DA CLASSE ▼▼▼
class CanViewProntuario(permissions.BasePermission):
    """
    Permissão restrita para prontuários. Acesso permitido APENAS para 'medico'.
    """
    def has_permission(self, request, view):
        """
        Permite acesso a listas (ex: /evolucoes/) SOMENTE se o usuário for um médico.
        """
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.cargo == 'medico'

    def has_object_permission(self, request, view, obj):
        """
        Permite acesso a um objeto específico (ex: /evolucoes/1/) se o médico for
        o autor do registro OU o médico responsável pelo paciente.
        """
        # A regra de cargo já foi verificada em has_permission, mas reforçamos.
        if request.user.cargo != 'medico':
            return False

        # Permite se o médico logado for o autor do registro
        if hasattr(obj, 'medico') and obj.medico == request.user:
            return True

        # Permite se o médico logado for o responsável pelo paciente
        if hasattr(obj, 'paciente') and hasattr(obj.paciente, 'medico_responsavel'):
            if obj.paciente.medico_responsavel == request.user:
                return True
        
        # Bloqueia qualquer outro caso (ex: Dr. A tentando ver detalhes da consulta do Dr. B
        # se não for o médico responsável pelo paciente).
        return False