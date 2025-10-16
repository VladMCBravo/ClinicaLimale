# backend/usuarios/views.py - VERSÃO CORRIGIDA
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from .models import CustomUser, Especialidade
from .serializers import UserSerializer, EspecialidadeSerializer

# --- SUAS VIEWS DE AUTENTICAÇÃO (SEM MUDANÇAS) ---
class CustomAuthTokenLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        # ▼▼▼ 2. A MÁGICA ACONTECE AQUI ▼▼▼
        # Em vez de criar um dicionário manual, usamos o UserSerializer.
        # Ele já sabe como buscar e formatar as especialidades.
        user_serializer = UserSerializer(user, context={'request': request})
        
        return Response({
            'token': token.key,
            'user': user_serializer.data  # Usamos os dados do serializer
        })

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