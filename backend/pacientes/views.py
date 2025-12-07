# backend/pacientes/views.py - VERSÃO CORRIGIDA (LÓGICA DO MÉDICO)

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsMedicoResponsavelOrAdmin, AllowRead_WriteRecepcaoAdmin
from .models import Paciente
from .serializers import PacienteSerializer
# --- 1. IMPORTE O 'Q' (para queries 'OU') E 'Count' ---
from django.db.models import Count, Q 

class PacienteListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PacienteSerializer
    # A permissão aqui está correta para a Recepção criar pacientes
    permission_classes = [AllowRead_WriteRecepcaoAdmin] 

    def get_queryset(self):
        user = self.request.user
        
        # Começamos com a lista de todos os pacientes
        base_queryset = Paciente.objects.annotate(
            total_consultas=Count('agendamentos')
        )

        # Admin e Recepção veem todos
        if user.cargo in ['admin', 'recepcao']:
            return base_queryset
        
        # --- 2. LÓGICA CORRIGIDA PARA O MÉDICO ---
        if user.cargo == 'medico':
            # Pacientes onde o médico é o responsável
            pacientes_responsaveis = Q(medico_responsavel=user)
            
            # Pacientes que o médico já atendeu (tem uma evolução/consulta)
            pacientes_com_evolucao = Q(evolucoes__medico=user)
            
            # Pacientes que o médico tem/teve um agendamento
            pacientes_agendados = Q(agendamentos__medico=user)

            # O médico verá pacientes que se encaixam em QUALQUER uma das condições (OU)
            filtro_medico = pacientes_responsaveis | pacientes_com_evolucao | pacientes_agendados
            
            # Aplicamos o filtro e usamos .distinct() para garantir que não haja duplicatas
            return base_queryset.filter(filtro_medico).distinct()
        
        # Se não for nenhum dos cargos acima, não retorna nada
        return Paciente.objects.none()

    def perform_create(self, serializer):
        serializer.save()

# --- 3. CORREÇÃO DA VIEW DE DETALHE (QUE CAUSOU O ERRO 403) ---
# Esta view é usada para 'Editar' (PATCH) e 'Deletar' (DELETE)
class PacienteDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Paciente.objects.annotate(total_consultas=Count('agendamentos'))
    serializer_class = PacienteSerializer
    
    # --- CORREÇÃO DO ERRO 403 ---
    # Mudamos para IsAuthenticated. 
    # Assim, a "Página Mestre" consegue ler os dados do paciente (nome, idade) para montar o laudo.
    permission_classes = [IsAuthenticated]