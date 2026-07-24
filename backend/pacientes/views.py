# backend/pacientes/views.py - VERSÃO COM SOFT DELETE

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
        
        # 🛡️ TRAVA 1: Puxa APENAS os pacientes ativos!
        base_queryset = Paciente.objects.filter(ativo=True)

        if user.cargo in ['admin', 'recepcao', 'medico']:
            qs = base_queryset 
        else:
            qs = Paciente.objects.none()

        final_qs = qs.annotate(total_consultas=Count('agendamentos', distinct=True))

        ids_encontrados = list(final_qs.values_list('id', flat=True))
        if len(ids_encontrados) != len(set(ids_encontrados)):
            logger.error(f"[DEBUG] ALERTA CRÍTICO: IDs duplicados! IDs: {ids_encontrados}")

        return final_qs

    def perform_create(self, serializer):
        serializer.save()


class PacienteDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PacienteSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # 🛡️ TRAVA 2: Evita que o detalhe de um paciente inativo seja acessado/editado pela URL
        base_queryset = Paciente.objects.filter(ativo=True).annotate(total_consultas=Count('agendamentos', distinct=True))
        
        if user.cargo in ['admin', 'recepcao', 'medico']:
            return base_queryset
            
        return Paciente.objects.none()