from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model

# Pegamos o seu CustomUser de forma segura
User = get_user_model()

class UserMeViewTests(APITestCase):
    
    def test_acesso_negado_sem_autenticacao(self):
        """
        Cenário: Tentativa de acessar os dados de perfil sem estar logado.
        Resultado Esperado: Bloqueio com HTTP 401 (Unauthorized).
        """
        url = reverse('user-me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_acesso_permitido_com_autenticacao(self):
        """
        Cenário: Usuário logado acessa a rota /me/.
        Resultado Esperado: Retorno HTTP 200 OK com os dados corretos do usuário.
        """
        # 1. Preparação (Setup): Criar um usuário no banco temporário
        usuario_teste = User.objects.create_user(
            username='doutor_teste', 
            password='senha_segura123',
            first_name='João',
            cargo='medico'
        )
        
        # Forçamos o cliente de testes a "logar" com este usuário
        self.client.force_authenticate(user=usuario_teste)
        
        url = reverse('user-me')
        
        # 2. Ação (Act): Fazemos a requisição GET
        response = self.client.get(url)
        
        # 3. Verificação (Assert): 
        # Confirma se o status da resposta é 200 (Sucesso)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Confirma se a API está devolvendo exatamente os dados que criamos
        self.assertEqual(response.data['username'], 'doutor_teste')
        self.assertEqual(response.data['first_name'], 'João')
        self.assertEqual(response.data['cargo'], 'medico')

class CustomUserViewSetTests(APITestCase):
    
    def setUp(self):
        """
        O método setUp roda ANTES de cada teste. 
        Usamos para criar os dados necessários (nosso usuário da recepção).
        """
        self.user_recepcao = User.objects.create_user(
            username='recepcao_teste',
            password='senha_segura123',
            first_name='Maria',
            cargo='recepcao'
        )
        # O DefaultRouter do Django cria automaticamente o sufixo '-list' para a rota POST
        self.url = reverse('usuario-list') 

    def test_recepcao_nao_pode_criar_usuario(self):
        """
        Cenário: Usuário com cargo 'recepcao' tenta criar um novo usuário no sistema.
        Resultado Esperado: Bloqueio imediato com HTTP 403 Forbidden.
        """
        self.client.force_authenticate(user=self.user_recepcao)
        
        # Dados de um suposto novo usuário que a recepção está tentando cadastrar
        novo_usuario_data = {
            'username': 'novo_medico',
            'password': '123',
            'first_name': 'Doutor Invasor',
            'cargo': 'medico'
        }
        
        response = self.client.post(self.url, novo_usuario_data)
        
        # Garantimos que o Django barrou a requisição por falta de permissão
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CertificadoUploadViewTests(APITestCase):
    
    def setUp(self):
        self.user_recepcao = User.objects.create_user(
            username='recepcao_cert',
            password='senha123',
            cargo='recepcao'
        )
        self.url = reverse('user-certificado')

    def test_recepcao_nao_pode_fazer_upload_de_certificado(self):
        """
        Cenário: Usuário com cargo 'recepcao' tenta acessar a rota de upload de .p12.
        Resultado Esperado: Bloqueio com HTTP 403 Forbidden, pois apenas médicos têm acesso.
        """
        self.client.force_authenticate(user=self.user_recepcao)
        
        # Mesmo enviando um payload vazio, a barreira de segurança deve atuar primeiro
        response = self.client.post(self.url, {})
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Verifica se a mensagem de erro customizada que você definiu na view está correta
        self.assertEqual(response.data['detail'], "Apenas médicos podem fazer upload de certificado digital.")