from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from pacientes.models import Paciente

User = get_user_model()

class PacienteListCreateTests(APITestCase):
    
    def setUp(self):
        """
        Preparação: Criamos uma usuária da recepção que será usada nos testes.
        """
        self.user_recepcao = User.objects.create_user(
            username='recepcao_pacientes',
            password='senha_segura123',
            first_name='Ana',
            cargo='recepcao'
        )
        # O nome 'lista-pacientes' vem do seu pacientes/urls.py
        self.url = reverse('lista-pacientes')

    def test_bloqueio_usuario_nao_autenticado(self):
        """
        Cenário: Um usuário sem token tenta acessar a lista de pacientes.
        Resultado Esperado: Erro 401 Unauthorized.
        """
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_recepcao_consegue_cadastrar_paciente(self):
        """
        Cenário: Usuário da recepção envia dados válidos para cadastrar um paciente.
        Resultado Esperado: Retorno HTTP 201 Created e o paciente deve estar salvo no banco.
        """
        self.client.force_authenticate(user=self.user_recepcao)
        
        # Dados mínimos obrigatórios segundo o seu modelo (os outros são blank/null=True)
        dados_paciente = {
            "nome_completo": "Carlos da Silva",
            "data_nascimento": "1990-05-20",
            "telefone_celular": "11999999999",
            "cpf": "12345678900"
        }
        
        # Faz a requisição POST simulando o envio de um formulário
        response = self.client.post(self.url, dados_paciente)
        
        # 1. Verifica se a API respondeu que foi criado com sucesso
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 2. Verifica fisicamente no banco de dados se a contagem de pacientes subiu para 1
        self.assertEqual(Paciente.objects.count(), 1)
        
        # 3. Verifica se o nome salvo no banco é exatamente o que enviamos
        paciente_salvo = Paciente.objects.first()
        self.assertEqual(paciente_salvo.nome_completo, "Carlos da Silva")

class PacienteVisibilidadeMedicoTests(APITestCase):
    
    def setUp(self):
        # 1. Criamos dois médicos distintos
        self.medico_a = User.objects.create_user(username='dr_alberto', password='123', cargo='medico')
        self.medico_b = User.objects.create_user(username='dr_bruno', password='123', cargo='medico')

        # 2. Criamos um paciente vinculado ao Médico A
        self.paciente_a = Paciente.objects.create(
            nome_completo="Carlos (Paciente do Dr. Alberto)",
            data_nascimento="1990-01-01",
            telefone_celular="11999999999",
            medico_responsavel=self.medico_a
        )

        # 3. Criamos um paciente vinculado ao Médico B
        self.paciente_b = Paciente.objects.create(
            nome_completo="Marcos (Paciente do Dr. Bruno)",
            data_nascimento="1985-05-05",
            telefone_celular="11888888888",
            medico_responsavel=self.medico_b
        )
        self.url = reverse('lista-pacientes')

    def test_medico_so_ve_seus_proprios_pacientes(self):
        """
        Cenário: Médico logado acessa a lista de pacientes.
        Resultado: Deve ver apenas os seus. Os pacientes de outros médicos devem ser omitidos.
        """
        # Forçamos o login com o Dr. Alberto
        self.client.force_authenticate(user=self.medico_a)
        response = self.client.get(self.url)
        
        # Garante que a requisição deu sucesso (200 OK)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # O assertContains verifica magicamente se o texto existe dentro da resposta da API
        # Garante que o paciente A está na tela
        self.assertContains(response, "Carlos (Paciente do Dr. Alberto)")
        
        # Garante que a regra de segurança funcionou e o paciente B está invisível!
        self.assertNotContains(response, "Marcos (Paciente do Dr. Bruno)")

    def test_recepcao_ve_todos_os_pacientes(self):
        """
        Cenário: Uma recepcionista acessa a lista de pacientes.
        Resultado Esperado: Diferente do médico, ela deve enxergar TODOS os pacientes da clínica.
        """
        # Vamos criar uma recepcionista na hora
        user_recepcao = User.objects.create_user(username='recepcao_visao', password='123', cargo='recepcao')
        self.client.force_authenticate(user=user_recepcao)
        
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # A recepção DEVE ver tanto o Carlos (do Dr. Alberto) quanto o Marcos (do Dr. Bruno)
        self.assertContains(response, "Carlos (Paciente do Dr. Alberto)")
        self.assertContains(response, "Marcos (Paciente do Dr. Bruno)")


class PacienteValidacaoTests(APITestCase):
    
    def setUp(self):
        self.user_recepcao = User.objects.create_user(
            username='recepcao_valida', password='123', cargo='recepcao'
        )
        self.url = reverse('lista-pacientes')

        # Criamos um paciente inicial que já "ocupa" um CPF e um E-mail no banco
        self.paciente_existente = Paciente.objects.create(
            nome_completo="Paciente Original",
            data_nascimento="1980-10-10",
            telefone_celular="11900000000",
            cpf="11122233344",
            email="paciente@clinica.com"
        )

    def test_bloqueio_de_cpf_duplicado(self):
        """
        Cenário: Recepção tenta cadastrar um paciente novo com um CPF que já existe.
        Resultado: Erro 400 Bad Request, impedindo a quebra de integridade do banco.
        """
        self.client.force_authenticate(user=self.user_recepcao)
        dados = {
            "nome_completo": "Invasor de CPF",
            "data_nascimento": "1999-09-09",
            "telefone_celular": "11911111111",
            "cpf": "11122233344"  # OPA! Este CPF já é do 'Paciente Original'
        }
        
        response = self.client.post(self.url, dados)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # O DRF é inteligente e coloca a mensagem de erro exatamente dentro do campo que falhou
        self.assertIn('cpf', response.data)

    def test_bloqueio_de_email_duplicado(self):
        """
        Cenário: Recepção tenta cadastrar um paciente novo com um E-mail que já existe.
        Resultado: Erro 400 Bad Request.
        """
        self.client.force_authenticate(user=self.user_recepcao)
        dados = {
            "nome_completo": "Invasor de Email",
            "data_nascimento": "1999-09-09",
            "telefone_celular": "11911111111",
            "email": "paciente@clinica.com"  # OPA! Este E-mail já é do 'Paciente Original'
        }
        
        response = self.client.post(self.url, dados)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_bloqueio_atualizacao_cpf_duplicado_state_leak(self):
        """
        Cenário Crítico (State Leak Guard): A recepção abre um paciente existente 
        para editar, mas tenta salvar usando o CPF de OUTRO paciente.
        Resultado: Erro 400. O Django não pode permitir roubo de CPF via método PUT.
        """
        # 1. Criamos a "Vítima" (já existe o "Paciente Original" do setUp)
        paciente_vitima = Paciente.objects.create(
            nome_completo="Vítima da Sobrescrita",
            data_nascimento="1995-05-05",
            telefone_celular="11922222222",
            cpf="99988877766" # O CPF que tentaremos roubar
        )

        self.client.force_authenticate(user=self.user_recepcao)
        
        # A URL para editar o 'Paciente Original'
        url_detalhe = reverse('detalhe-paciente', kwargs={'pk': self.paciente_existente.id})
        
        # Tentamos atualizar o Paciente Original injetando o CPF da Vítima
        dados_maliciosos = {
            "nome_completo": "Nome Alterado",
            "cpf": "99988877766" # Roubando o CPF da Vítima!
        }
        
        # Fazemos um PATCH (Atualização parcial)
        response = self.client.patch(url_detalhe, dados_maliciosos)
        
        # O sistema DEVE barrar
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cpf', response.data)

    def test_permite_atualizacao_com_o_proprio_cpf(self):
        """
        Cenário: A recepção abre o paciente e salva sem mudar o CPF.
        Resultado: Sucesso (200 OK). O sistema não pode dizer "CPF duplicado" 
        se o CPF já pertence a ele mesmo.
        """
        self.client.force_authenticate(user=self.user_recepcao)
        url_detalhe = reverse('detalhe-paciente', kwargs={'pk': self.paciente_existente.id})
        
        # Atualiza o telefone, mas mantém o mesmo CPF
        dados = {
            "telefone_celular": "11933334444",
            "cpf": "11122233344" # O CPF que já é dele no setUp
        }
        
        response = self.client.patch(url_detalhe, dados)
        self.assertEqual(response.status_code, status.HTTP_200_OK)