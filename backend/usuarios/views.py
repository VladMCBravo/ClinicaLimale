# backend/usuarios/views.py - VERSÃO CORRIGIDA
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from .models import CustomUser, Especialidade, JornadaDeTrabalho, CertificadoMedico
from .serializers import UserSerializer, EspecialidadeSerializer, JornadaDeTrabalhoSerializer, UserMeUpdateSerializer
from cryptography.hazmat.primitives.serialization import pkcs12
from django.utils import timezone
from django.db.models import Count

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
        Filtra corretamente os usuários por cargo e OTIMIZA a busca 
        das especialidades (Many-to-Many) para evitar N+1 queries.
        """
        # Adicionamos o prefetch_related para carregar as especialidades de uma vez só
        queryset = CustomUser.objects.prefetch_related('especialidades').all().order_by('first_name')
        
        cargo = self.request.query_params.get('cargo')
        if cargo:
            queryset = queryset.filter(cargo=cargo)
            
        return queryset

    def get_permissions(self):
        """
        Permissões: Qualquer um logado pode listar, mas só Admin pode modificar 
        usuários de terceiros.
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

    # SUBSTITUÍMOS A PERMISSÃO FIXA POR UMA DINÂMICA
    def get_permissions(self):
        # Qualquer usuário logado (Recepção, Médico, etc) pode LISTAR e LER as jornadas
        if self.action in ['list', 'retrieve']:
            self.permission_classes = [IsAuthenticated]
        # Mas apenas Administradores podem CRIAR, EDITAR ou EXCLUIR
        else:
            self.permission_classes = [IsAdminUser]
        return super().get_permissions()

    def get_queryset(self):
        queryset = JornadaDeTrabalho.objects.all().select_related('medico')
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
            'first_name': user.first_name, # <-- Adicionado para o form do frontend
            'last_name': user.last_name,   # <-- Adicionado para o form do frontend
            'telefone': user.telefone,     # <-- Adicionado para o form do frontend
            'cargo': user.cargo,
            'crm': user.crm,
            'tem_certificado_valido': tem_certificado # <--- O FRONTEND ESPERA ISSO
        }
        return Response(data)
    
    def patch(self, request):
        """
        Permite que o usuário atualize seus próprios dados cadastrais básicos.
        """
        user = request.user
        serializer = UserMeUpdateSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({"detail": "Perfil atualizado com sucesso!", "data": serializer.data})
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# No final do arquivo, adicione a View do Certificado:
class CertificadoUploadView(APIView):
    """
    Recebe o arquivo .p12 e a senha. Valida se a senha abre o certificado,
    extrai a data de validade e salva com segurança.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.cargo != 'medico':
            return Response(
                {"detail": "Apenas médicos podem fazer upload de certificado digital."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        arquivo = request.FILES.get('arquivo_p12')
        senha = request.data.get('senha')

        if not arquivo or not senha:
            return Response(
                {"detail": "O arquivo .p12 e a senha são obrigatórios."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 1. Tenta abrir o certificado com a senha fornecida
            arquivo_bytes = arquivo.read()
            private_key, certificate, additional_certificates = pkcs12.load_key_and_certificates(
                arquivo_bytes,
                senha.encode()
            )

            # 2. Se passou da linha acima, a senha está correta! 
            # Vamos extrair a data de validade do certificado real.
            data_exp = certificate.not_valid_after
            if timezone.is_naive(data_exp):
                data_exp = timezone.make_aware(data_exp)

            # 3. Retorna o ponteiro de leitura do arquivo para o início para o Django conseguir salvar
            arquivo.seek(0)

            # 4. Salva no banco de dados
            certificado, created = CertificadoMedico.objects.get_or_create(medico=user)
            certificado.arquivo_p12 = arquivo
            certificado.set_password(senha)
            certificado.data_expiracao = data_exp
            certificado.save()

            return Response({
                "detail": "Certificado validado e salvo com sucesso!",
                "data_expiracao": data_exp
            })

        except ValueError:
            return Response(
                {"detail": "Senha incorreta ou arquivo .p12 corrompido/inválido."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"detail": f"Erro interno ao processar certificado: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
# backend/usuarios/views.py

class VerificarCertificadoView(APIView):
    """
    Tenta abrir o certificado salvo com a senha criptografada 
    para garantir que a assinatura funcionará.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            if not hasattr(user, 'certificado') or not user.certificado.arquivo_p12:
                return Response({"detail": "Nenhum certificado encontrado."}, status=404)
            
            certificado = user.certificado
            # 1. Recupera a senha descriptografada
            senha = certificado.get_password()
            
            # 2. Lê os bytes do arquivo
            with certificado.arquivo_p12.open('rb') as f:
                p12_data = f.read()
            
            # 3. Tenta carregar o certificado
            pkcs12.load_key_and_certificates(p12_data, senha.encode())
            
            return Response({
                "status": "sucesso",
                "detail": "Certificado pronto para uso. Assinatura validada!",
                "expiracao": certificado.data_expiracao
            })
            
        except Exception as e:
            return Response({
                "status": "erro",
                "detail": f"Falha na validação: {str(e)}"
            }, status=400)

class MedicosComJornadaListView(generics.ListAPIView):
    serializer_class = UserSerializer
    def get_queryset(self):
        # Retorna apenas usuários médicos que têm pelo menos 1 jornada cadastrada
        return CustomUser.objects.filter(cargo='medico').annotate(
            num_jornadas=Count('jornadas_de_trabalho')
        ).filter(num_jornadas__gt=0)