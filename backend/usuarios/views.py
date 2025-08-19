# backend/usuarios/views.py - VERSÃO CORRIGIDA
from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser # Mantenha IsAdminUser
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from .models import CustomUser
from .serializers import MedicoSerializer, UserSerializer, UserCreateSerializer

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

class MedicoListView(generics.ListAPIView):
    queryset = CustomUser.objects.filter(cargo='medico').order_by('first_name')
    serializer_class = MedicoSerializer
    permission_classes = [IsAuthenticated]

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all().order_by('first_name')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    # MÉTODO DE PERMISSÃO CORRIGIDO
    def get_permissions(self):
        """
        Permite que qualquer usuário logado LISTE os usuários (necessário para
        selecionar médicos), mas apenas admins podem CRIAR, EDITAR ou DELETAR.
        """
        if self.action == 'list':
            # Qualquer um logado pode ver a lista
            self.permission_classes = [IsAuthenticated]
        else:
            # Apenas admins podem fazer as outras ações
            self.permission_classes = [IsAdminUser]
        return super().get_permissions()