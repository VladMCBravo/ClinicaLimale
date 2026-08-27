# backend/usuarios/permissions.py - VERSÃO FINAL E ESTÁVEL

from rest_framework import permissions
from rest_framework.permissions import BasePermission, SAFE_METHODS
from pacientes.models import Paciente
from .models import ConfiguracaoClinica

# --- PERMISSÕES BÁSICAS COM DEBUG ---

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        print(f"[DEBUG] Checking IsAdminUser for user: {request.user.username} on path: {request.path}")
        return request.user and request.user.is_authenticated and request.user.cargo == 'admin'

class IsRecepcaoUser(permissions.BasePermission):
    def has_permission(self, request, view):
        print(f"[DEBUG] Checking IsRecepcaoUser for user: {request.user.username} on path: {request.path}")
        return request.user and request.user.is_authenticated and request.user.cargo == 'recepcao'

class IsMedicoUser(permissions.BasePermission):
    def has_permission(self, request, view):
        print(f"[DEBUG] Checking IsMedicoUser for user: {request.user.username} on path: {request.path}")
        return request.user and request.user.is_authenticated and request.user.cargo == 'medico'

class IsRecepcaoOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        print(f"[DEBUG] Checking IsRecepcaoOrAdmin for user: {request.user.username} on path: {request.path}")
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.cargo in ['admin', 'recepcao']

# ESTA CLASSE É ESSENCIAL PARA OUTROS APPS E FOI RESTAURADA
class IsMedicoResponsavelOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        print(f"[DEBUG] Checking IsMedicoResponsavelOrAdmin for user: {request.user.username} on path: {request.path}")
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

# ESTA CLASSE É ESSENCIAL PARA OUTROS APPS E FOI RESTAURADA
class AllowRead_WriteRecepcaoAdmin(BasePermission):
    def has_permission(self, request, view):
        print(f"[DEBUG] Checking AllowRead_WriteRecepcaoAdmin for user: {request.user.username} on path: {request.path}")
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.cargo in ['admin', 'recepcao']


# --- NOVA PERMISSÃO, SEGURA E APLICADA APENAS AO PRONTUÁRIO (LGPD) ---

class CanViewProntuario(permissions.BasePermission):
    def has_permission(self, request, view):
        print(f"[DEBUG] Checking CanViewProntuario for user: {request.user.username} on path: {request.path}")
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.cargo == 'medico'

    def has_object_permission(self, request, view, obj):
        print(f"[DEBUG] Checking CanViewProntuario (object-level) for user: {request.user.username}")
        return request.user.cargo == 'medico'


# Atestados/Declarações: médico pode listar e criar qualquer tipo. Recepção/admin só
# podem CRIAR o tipo 'Comparecimento' (Declaração de Comparecimento ou de Acompanhante,
# que no formulário viram o mesmo tipo_atestado) — Atestado de Afastamento e de Aptidão
# Física são atos privativos de médico (Código de Ética Médica / Resoluções CFM) e
# continuam bloqueados pra quem não é médico. Listagem (GET) segue restrita a médico,
# como o resto do prontuário.
class CanCreateAtestado(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.cargo == 'medico':
            return True
        if request.method == 'POST':
            return request.data.get('tipo_atestado') == 'Comparecimento'
        return False


class IsAdminOrRecepcaoTemporario(permissions.BasePermission):
    """
    Permite acesso se o usuário for Admin, OU se for Recepção e a chave 
    'recepcao_ve_configuracoes' estiver ligada na configuração da clínica.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.cargo == 'admin':
            return True
            
        if request.user.cargo == 'recepcao':
            # Busca a configuração
            config = ConfiguracaoClinica.objects.first()
            if config and config.recepcao_ve_configuracoes:
                return True
                
        return False