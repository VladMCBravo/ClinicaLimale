# backend/usuarios/views.py - VERSÃO CORRIGIDA
import re
import math
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from .models import CustomUser, Especialidade, JornadaDeTrabalho, CertificadoMedico, ValorEspecialidadeConvenio, RegistroPonto, ConfiguracaoClinica
from .serializers import UserSerializer, EspecialidadeSerializer, JornadaDeTrabalhoSerializer, UserMeUpdateSerializer, ConfiguracaoClinicaSerializer, RegistroPontoSerializer, RegistroPontoAdminSerializer   
from cryptography.hazmat.primitives.serialization import pkcs12
from django.utils import timezone
from django.db.models import Count, Q

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
    
    @action(detail=True, methods=['post'], url_path='definir-preco-convenio')
    def definir_preco(self, request, pk=None):
        especialidade = self.get_object()
        plano_id = request.data.get('plano_convenio_id')
        valor = request.data.get('valor')
        
        ValorEspecialidadeConvenio.objects.update_or_create(
            especialidade=especialidade, 
            plano_convenio_id=plano_id, 
            defaults={'valor': valor}
        )
        return Response({"msg": "Preço da consulta atualizado com sucesso!"})

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

# 1. A NOVA VIEW PARA A TELA DE CONFIGURAÇÕES DO FRONTEND
class ConfiguracaoClinicaView(APIView):
    permission_classes = [IsAuthenticated] # Só quem está logado pode acessar/editar

    def get(self, request):
        # Pega a primeira configuração ou cria uma em branco se não existir
        config, created = ConfiguracaoClinica.objects.get_or_create(id=1)
        serializer = ConfiguracaoClinicaSerializer(config)
        return Response(serializer.data)

    def patch(self, request):
        # Apenas Admin pode alterar
        if request.user.cargo != 'admin':
            return Response({"detail": "Apenas administradores podem editar a clínica."}, status=status.HTTP_403_FORBIDDEN)
            
        config = ConfiguracaoClinica.objects.first()
        serializer = ConfiguracaoClinicaSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def calcular_distancia_haversine(lat1, lon1, lat2, lon2):
    """Calcula a distância em metros entre duas coordenadas geográficas"""
    if None in [lat1, lon1, lat2, lon2]:
        return None
        
    R = 6371000 # Raio da Terra em metros
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# --- NOVA VIEW PARA CONFIGURAÇÕES DA CLÍNICA ---
class ConfiguracaoClinicaView(APIView):
    permission_classes = [IsAuthenticated] # Só quem está logado pode acessar/editar

    def get(self, request):
        # Pega a primeira configuração ou cria uma em branco se não existir
        config, created = ConfiguracaoClinica.objects.get_or_create(id=1)
        serializer = ConfiguracaoClinicaSerializer(config)
        return Response(serializer.data)

    def patch(self, request):
        # Apenas Admin pode alterar
        if request.user.cargo != 'admin':
            return Response({"detail": "Apenas administradores podem editar a clínica."}, status=status.HTTP_403_FORBIDDEN)
            
        config = ConfiguracaoClinica.objects.first()
        serializer = ConfiguracaoClinicaSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- VIEW DO PONTO ATUALIZADA PARA LER DO BANCO DE DADOS ---
class BaterPontoView(APIView):
    """
    Endpoint dedicado para bater o ponto. Registra sucessos e falhas (auditoria).
    """
    permission_classes = [AllowAny] 

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for: return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

    def post(self, request):
        cpf_recebido = request.data.get('cpf')
        pin = request.data.get('pin')
        tipo = request.data.get('tipo', 'entrada') 
        lat_usuario = request.data.get('latitude')
        lng_usuario = request.data.get('longitude')

        # 1. Deixa de exigir lat/lng na primeira validação
        if not cpf_recebido or not pin:
            return Response({"detail": "CPF e PIN são obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Busca o Usuário
        cpf_limpo = re.sub(r'\D', '', cpf_recebido)
        # Monta a versão com pontuação para garantir a busca
        cpf_formatado = f"{cpf_limpo[:3]}.{cpf_limpo[3:6]}.{cpf_limpo[6:9]}-{cpf_limpo[9:]}" if len(cpf_limpo) == 11 else cpf_recebido
        
        try:
            # Procura por todas as variações (só números, formatado, ou exatamente como foi recebido)
            usuario = CustomUser.objects.get(Q(cpf=cpf_limpo) | Q(cpf=cpf_formatado) | Q(cpf=cpf_recebido))
        except CustomUser.DoesNotExist:
            return Response({"detail": "Funcionário não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except CustomUser.MultipleObjectsReturned:
            # Prevenção extra caso haja dois usuários com o mesmo CPF
            usuario = CustomUser.objects.filter(Q(cpf=cpf_limpo) | Q(cpf=cpf_formatado) | Q(cpf=cpf_recebido)).first()

        # 3. Busca GPS da Clínica e calcula distância (SÓ SE O PC MANDOU COORDENADAS)
        config = ConfiguracaoClinica.objects.first()
        distancia = None
        
        if config and config.latitude and config.longitude and lat_usuario and lng_usuario:
            try:
                lat_float = float(lat_usuario)
                lng_float = float(lng_usuario)
                distancia = calcular_distancia_haversine(config.latitude, config.longitude, lat_float, lng_float)
            except (ValueError, TypeError):
                pass 

        # 4. Motor de Regras (Auditoria)
        status_ponto = 'aprovado'
        # Adiciona uma nota para o RH se foi batido via PC sem GPS
        observacao = 'Ponto via PC (Sem GPS)' if not lat_usuario else ''
        erro_response = None

        pin_digitado = str(pin).strip()
        
        if not usuario.pin_ponto:
            status_ponto = 'rejeitado'
            observacao = 'Bloqueado: PIN não configurado'
            erro_response = Response({"detail": "PIN não configurado no perfil."}, status=status.HTTP_400_BAD_REQUEST)
            
        elif str(usuario.pin_ponto).strip() != pin_digitado:
            status_ponto = 'rejeitado'
            observacao = 'Bloqueado: PIN Incorreto'
            erro_response = Response({"detail": "O PIN digitado está incorreto."}, status=status.HTTP_400_BAD_REQUEST)
            
        elif config and distancia is not None and distancia > config.raio_metros:
            status_ponto = 'rejeitado'
            observacao = f'Bloqueado: Fora do raio permitido ({int(distancia)}m)'
            erro_response = Response({
                "detail": f"Você está a {int(distancia)} metros da clínica. Máximo permitido: {config.raio_metros}m.",
                "distancia": distancia
            }, status=status.HTTP_400_BAD_REQUEST)

        # 5. Salva o Registro
        registro = RegistroPonto.objects.create(
            usuario=usuario,
            tipo=tipo,
            latitude=lat_usuario if lat_usuario else None,
            longitude=lng_usuario if lng_usuario else None,
            distancia_metros=distancia,
            status=status_ponto,
            observacao=observacao,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
        )

        if erro_response:
            return erro_response

        return Response({
            "detail": "Ponto registrado com sucesso!",
            "tipo": registro.get_tipo_display(),
            "data_hora": registro.data_hora,
            "distancia_metros": int(distancia) if distancia else None
        }, status=status.HTTP_201_CREATED)

# --- NOVA VIEW DO RELATÓRIO PARA O ADMIN ---
class RegistroPontoAdminViewSet(viewsets.ModelViewSet):
    """
    Gerenciamento completo do Ponto pelo RH.
    Permite listar, adicionar manualmente, editar e inativar registros.
    """
    serializer_class = RegistroPontoAdminSerializer # Usamos o novo serializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return RegistroPonto.objects.select_related('usuario').all().order_by('-data_hora')

    def perform_create(self, serializer):
        # Quando o RH criar um ponto manual, o status padrão é ajuste_manual
        status_ponto = serializer.validated_data.get('status', 'ajuste_manual')
        observacao_inicial = serializer.validated_data.get('observacao', '')
        
        # Assina o log automaticamente
        obs_auditoria = f"[CRIADO POR RH: {self.request.user.get_full_name()}] {observacao_inicial}"
        
        serializer.save(
            status=status_ponto,
            observacao=obs_auditoria.strip(),
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_update(self, serializer):
        # Ao editar um registro (alterar horário, etc), assina no final
        nova_obs = serializer.validated_data.get('observacao', '')
        
        # Se a string [Editado] ainda não estiver lá, nós adicionamos
        if "[Editado por RH:" not in nova_obs:
            obs_auditoria = f"{nova_obs} | [Editado por RH: {self.request.user.get_full_name()}]"
            serializer.save(observacao=obs_auditoria)
        else:
            serializer.save()

    def perform_destroy(self, instance):
        """
        SOFT DELETE: Não apaga do banco. Apenas muda o status e assina o cancelamento.
        """
        instance.status = 'cancelado'
        obs_atual = instance.observacao or ""
        instance.observacao = f"[CANCELADO POR RH: {self.request.user.get_full_name()}] {obs_atual}"
        instance.save()