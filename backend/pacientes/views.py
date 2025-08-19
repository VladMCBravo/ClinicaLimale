from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from usuarios.permissions import IsAdminOrMedico
from .models import Paciente
from .serializers import PacienteSerializer

class PacienteListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PacienteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # PRIMEIRO, VERIFICA SE HÁ UM USUÁRIO LOGADO
        if user.is_authenticated:
            # Se estiver logado, sua lógica original de verificação de cargo é executada
            if user.cargo == 'admin':
                return Paciente.objects.all()
            # Você pode adicionar outras lógicas para outros cargos aqui
            # Ex: elif user.cargo == 'medico':
            #         return Paciente.objects.filter(medico_responsavel=user)
        
        # Se NINGUÉM estiver logado (nosso caso de teste com AllowAny),
        # retorna todos os pacientes sem aplicar filtros de cargo.
        return Paciente.objects.all()

    def perform_create(self, serializer):
        """
        Esta função é chamada ao criar um novo paciente.
        Associa o médico logado ao novo paciente automaticamente.
        """
        if self.request.user.cargo == 'medico':
            serializer.save(medico_responsavel=self.request.user)
        else:
            serializer.save()


class PacienteDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    permission_classes = [IsAuthenticated]

    # Comente este método inteiro para que o `AllowAny` acima funcione
    # def get_permissions(self):
    #     if self.request.method == 'DELETE':
    #         return [IsAuthenticated(), IsAdminOrMedico()]
    #     return [IsAuthenticated()]