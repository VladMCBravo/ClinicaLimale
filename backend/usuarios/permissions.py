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
    Permissão customizada que permite acesso a um objeto (Evolucao, Prescricao, etc.) se:
    1. O usuário for Admin.
    2. O usuário for o médico que criou o objeto (ex: a evolução).
    3. O usuário for o médico responsável geral pelo paciente associado ao objeto.
    """
    def has_permission(self, request, view):
        """
        Esta verificação de nível de view é um passo inicial.
        Ela garante que um médico só pode tentar acessar listas de um paciente
        se ele for o médico responsável.
        """
        # Admins sempre têm permissão
        if request.user and request.user.is_staff:
            return True

        # Se não for admin, deve ser um médico logado
        if not (request.user and request.user.is_authenticated and request.user.cargo == 'medico'):
            return False

        paciente_id = view.kwargs.get('paciente_id')
        if not paciente_id:
            # Se a URL não tiver um paciente_id, não podemos verificar, então negamos.
            return False

        try:
            paciente = Paciente.objects.get(pk=paciente_id)
            return paciente.medico_responsavel == request.user
        except Paciente.DoesNotExist:
            return False


    def has_object_permission(self, request, view, obj):
        """
        Esta verificação de nível de objeto é a principal e resolve o erro 403.
        O 'obj' aqui é a instância específica da Evolucao.
        """
        # Admins sempre têm permissão
        if request.user and request.user.is_staff:
            return True

        # ▼▼▼ A CORREÇÃO ESTÁ AQUI ▼▼▼
        # Verificação 1: O usuário logado é o médico que criou este registro?
        # O 'obj' é a Evolução, e ele tem um campo 'medico'.
        if hasattr(obj, 'medico') and obj.medico == request.user:
            return True

        # Verificação 2: O usuário logado é o médico responsável pelo paciente deste registro?
        if hasattr(obj, 'paciente') and hasattr(obj.paciente, 'medico_responsavel'):
            if obj.paciente.medico_responsavel == request.user:
                return True
        
        # Se nenhuma das condições acima for atendida, nega o acesso.
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