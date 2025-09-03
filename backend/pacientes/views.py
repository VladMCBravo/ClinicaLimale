# backend/pacientes/views.py - VERSÃO OTIMIZADA

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsMedicoResponsavelOrAdmin, AllowRead_WriteRecepcaoAdmin
from .models import Paciente
from .serializers import PacienteSerializer
from django.db.models import Count # <-- 1. IMPORTE O 'Count'

class PacienteListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PacienteSerializer
    permission_classes = [AllowRead_WriteRecepcaoAdmin]

    def get_queryset(self):
        user = self.request.user
        base_queryset = Paciente.objects.all()

        # 2. A MÁGICA ACONTECE AQUI:
        # Pedimos ao Django para adicionar um novo campo 'total_consultas' em cada paciente,
        # contendo a contagem de seus agendamentos. Isso é feito de forma super eficiente.
        queryset_anotado = base_queryset.annotate(
            total_consultas=Count('agendamentos')
        )
        
        # O resto da sua lógica de permissão continua a mesma, mas agora sobre o queryset otimizado
        if user.cargo in ['admin', 'recepcao']:
            return queryset_anotado
        
        if user.cargo == 'medico':
            return queryset_anotado.filter(medico_responsavel=user)
        
        return Paciente.objects.none()

    def perform_create(self, serializer):
        serializer.save()

# A PacienteDetailAPIView não precisa de alterações, mas podemos otimizá-la também se quisermos
class PacienteDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Paciente.objects.annotate(total_consultas=Count('agendamentos')) # Adicionamos a otimização aqui também
    serializer_class = PacienteSerializer
    permission_classes = [AllowRead_WriteRecepcaoAdmin]