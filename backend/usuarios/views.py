# backend/usuarios/views.py - VERSÃO CORRIGIDA
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from .models import CustomUser, Especialidade, JornadaDeTrabalho
from .serializers import UserSerializer, EspecialidadeSerializer, JornadaDeTrabalhoSerializer

# --- SUAS VIEWS DE AUTENTICAÇÃO (SEM MUDANÇAS) ---
class CustomAuthTokenLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        user_data = {'id': user.pk, 'username': user.username, 'first_name': user.first_name, 'last_name': user.last_name, 'cargo': user.cargo }
        return Response({ 'token': token.key, 'user': user_data })

class LogoutView(APIView):
    def post(self, request, *args, **kwargs):
        try:
            request.user.auth_token.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except (AttributeError, Token.DoesNotExist):
            return Response({"detail": "Token não encontrado ou usuário não autenticado."}, status=status.HTTP_400_BAD_REQUEST)

# --- VIEWSET DE USUÁRIOS UNIFICADA E CORRIGIDA ---
class CustomUserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    
    def get_queryset(self):
        """
        Esta função agora filtra corretamente os usuários por cargo.
        Resolve o problema do "Médico Responsável" no modal de pacientes.
        """
        queryset = CustomUser.objects.all().order_by('first_name')
        cargo = self.request.query_params.get('cargo')
        if cargo:
            queryset = queryset.filter(cargo=cargo)
        return queryset

    def get_permissions(self):
        """
        Permissões: Qualquer um logado pode listar, mas só Admin pode modificar.
        """
        if self.action == 'list':
            self.permission_classes = [IsAuthenticated]
        else:
            self.permission_classes = [IsAdminUser]
        return super().get_permissions()

# --- VIEWSET DE ESPECIALIDADES (SEM MUDANÇAS) ---
class EspecialidadeViewSet(viewsets.ModelViewSet):
    queryset = Especialidade.objects.all().order_by('nome')
    serializer_class = EspecialidadeSerializer
    permission_classes = [IsAuthenticated]
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAdminUser]
        return super().get_permissions()

# --- ADICIONE ESTE NOVO VIEWSET ---
class JornadaTrabalhoViewSet(viewsets.ModelViewSet):
    serializer_class = JornadaDeTrabalhoSerializer
    permission_classes = [IsAdminUser] # Apenas Admin pode definir jornadas

    def get_queryset(self):
        """
        Retorna todas as jornadas, com 'select_related' para otimizar
        a busca pelo nome do médico.
        """
        queryset = JornadaDeTrabalho.objects.all().select_related('medico')
        
        # Permite filtrar por médico, ex: /api/jornadas/?medico_id=2
        medico_id = self.request.query_params.get('medico_id')
        if medico_id:
            queryset = queryset.filter(medico_id=medico_id)
            
        return queryset.order_by('medico__first_name', 'dia_da_semana', 'hora_inicio')

class UserMeView(APIView):
    """
    Retorna os dados do usuário logado e se ele possui certificado digital válido.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Verifica se existe certificado vinculado e se tem arquivo
        tem_certificado = False
        if hasattr(user, 'certificado') and user.certificado.arquivo_p12:
            tem_certificado = True
            
        data = {
            'id': user.id,
            'username': user.username,
            'nome_completo': user.get_full_name(),
            'crm': user.crm,
            'tem_certificado_valido': tem_certificado # <--- O FRONTEND ESPERA ISSO
        }
        return Response(data)