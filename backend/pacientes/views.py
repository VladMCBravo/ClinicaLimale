# backend/pacientes/views.py - VERSÃO CORRIGIDA E BLINDADA

from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from .models import Paciente
from .serializers import PacienteSerializer
from django.db.models import Count, Q 
import logging

logger = logging.getLogger(__name__)

class PacienteListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PacienteSerializer
    permission_classes = [IsAuthenticated] 

    filter_backends = [filters.SearchFilter]
    search_fields = ['nome_completo', 'cpf', 'telefone_celular', 'email']

    def get_queryset(self):
        user = self.request.user
        logger.info(f"[DEBUG] Buscando pacientes para: {user.email} (Cargo: {user.cargo})")
        
        base_queryset = Paciente.objects.all()

        # 🛡️ CORREÇÃO CRÍTICA 1: Separação de Poderes Ajustada!
        # Agora Admin, Recepção E Médico veem a clínica inteira para poder gerar Laudos.
        if user.cargo in ['admin', 'recepcao', 'medico']:
            qs = base_queryset 
        else:
            qs = Paciente.objects.none()

        logger.info(f"[DEBUG] Pacientes encontrados (antes do annotate): {qs.count()}")

        final_qs = qs.annotate(total_consultas=Count('agendamentos', distinct=True))

        # LOG DE VERIFICAÇÃO FINAL
        ids_encontrados = list(final_qs.values_list('id', flat=True))
        if len(ids_encontrados) != len(set(ids_encontrados)):
            logger.error(f"[DEBUG] ALERTA CRÍTICO: IDs duplicados! IDs: {ids_encontrados}")

        return final_qs

    def perform_create(self, serializer):
        serializer.save()


class PacienteDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PacienteSerializer
    permission_classes = [IsAuthenticated]
    
    # 🛡️ CORREÇÃO CRÍTICA 2: Fechando a "Porta dos Fundos" da URL direta
    def get_queryset(self):
        user = self.request.user
        base_queryset = Paciente.objects.annotate(total_consultas=Count('agendamentos', distinct=True))
        
        # Aplicamos a mesma liberação de segurança aqui!
        # O médico precisa acessar a URL de detalhes para gerar os laudos corretamente.
        if user.cargo in ['admin', 'recepcao', 'medico']:
            return base_queryset
            
        return Paciente.objects.none()