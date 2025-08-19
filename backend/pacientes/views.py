# backend/pacientes/views.py - VERSÃO CORRIGIDA
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsMedicoResponsavelOrAdmin # Importe a permissão corrigida
from .models import Paciente
from .serializers import PacienteSerializer

class PacienteListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PacienteSerializer
    # Qualquer usuário logado pode listar pacientes (a lógica de filtragem está abaixo)
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Admin e Recepção veem todos os pacientes
        if user.cargo in ['admin', 'recepcao']:
            return Paciente.objects.all()
        
        # Médicos veem apenas os seus pacientes
        if user.cargo == 'medico':
            return Paciente.objects.filter(medico_responsavel=user)
        
        # Retorna uma lista vazia por segurança para qualquer outro caso
        return Paciente.objects.none()

    def perform_create(self, serializer):
        # A lógica de criação agora confia nos dados enviados pelo modal
        # Se um médico estiver criando, o modal já enviará o ID dele.
        serializer.save()

class PacienteDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    # APLICA A REGRA: Apenas o médico responsável ou um admin podem ver/editar/deletar os detalhes de um paciente.
    # Recepção será bloqueada aqui.
    permission_classes = [IsMedicoResponsavelOrAdmin]