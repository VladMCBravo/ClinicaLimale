# backend/usuarios/views.py - VERSÃO COMPLETA

from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from .models import CustomUser
# Importamos todos os nossos serializers
from .serializers import MedicoSerializer, UserSerializer, UserCreateSerializer

# Sua CustomAuthTokenLoginView e LogoutView continuam as mesmas...
class CustomAuthTokenLoginView(ObtainAuthToken):
    # ... (código existente sem alterações)
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        user_data = {'id': user.pk, 'username': user.username, 'first_name': user.first_name, 'last_name': user.last_name, 'cargo': user.cargo }
        return Response({ 'token': token.key, 'user': user_data })

class LogoutView(APIView):
    # ... (código existente sem alterações)
    def post(self, request, *args, **kwargs):
        try:
            request.user.auth_token.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except (AttributeError, Token.DoesNotExist):
            return Response({"detail": "Token não encontrado ou usuário não autenticado."}, status=status.HTTP_400_BAD_REQUEST)

# Sua MedicoListView continua a mesma...
class MedicoListView(generics.ListAPIView):
    # ... (código existente sem alterações)
    queryset = CustomUser.objects.filter(cargo='medico').order_by('first_name')
    serializer_class = MedicoSerializer
    permission_classes = [IsAuthenticated]


# -----------------------------------------------------------------------------

# NOVO VIEWSET PARA GERENCIAMENTO COMPLETO DE USUÁRIOS
class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet que provê as ações de `list`, `create`, `retrieve`,
    `update` e `partial_update` para os usuários.
    Apenas administradores podem acessar.
    """
    queryset = CustomUser.objects.all().order_by('first_name')
    permission_classes = [IsAdminUser] # Apenas Admins podem gerenciar usuários

    # Este método inteligente escolhe o serializer correto dependendo da ação
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer