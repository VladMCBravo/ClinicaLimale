from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from exames.models import Exame
from pacientes.models import Paciente
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings # <-- IMPORTAÇÃO AQUI
import datetime

# 👇 A MÁGICA ACONTECE AQUI 👇 
# Mandamos o Django usar o armazenamento local e não a AWS S3 durante este teste
@override_settings(STORAGES={
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
})
class ExamesSegurancaTests(APITestCase):
    
    def setUp(self):
        # 1. Criamos um paciente
        self.paciente = Paciente.objects.create(
            nome_completo="Paciente Teste Exame", 
            cpf="11122233344",
            data_nascimento="1990-01-01"
        )
        
        # 2. Criamos um exame "cru" (simulando a máquina de USG salvando no banco)
        self.exame = Exame.objects.create(
            paciente=self.paciente,
            nome_paciente_pasta="PACIENTE_TESTE_USG",
            data_exame=timezone.now().date(),
            status="DISPONIVEL",
            codigo_acesso="EX-TESTE123", 
            senha_acesso="SENHA_CORRETA"
        )
        
        # URL da view AcessarResultadosView baseada no seu urls.py
        self.url_acesso = reverse('acessar_exame')
   
    def test_portal_bloqueia_acesso_com_senha_incorreta(self):
        """
        Cenário: Alguém tenta acessar o exame usando o código correto, mas com senha errada.
        Resultado Esperado: A API deve bloquear e NÃO retornar Status 200 (OK).
        """
        # Tentativa de invasão
        payload = {
            "codigo_acesso": self.exame.codigo_acesso,
            "senha_acesso": "SENHA_HACKER_ERRADA"
        }
        
        response = self.client.post(self.url_acesso, payload)
        
        # AQUI É A NOSSA TRAVA DE SEGURANÇA. Se a API der 200, o teste falha!
        self.assertNotEqual(
            response.status_code, 
            status.HTTP_200_OK, 
            "FALHA DE SEGURANÇA: A API permitiu acessar o exame com a senha errada!"
        )
    
    def test_maquina_usg_enviando_multiplas_imagens_nao_deve_duplicar_exames(self):
        """
        Cenário: A máquina de USG envia 2 imagens seguidas para a mesma pasta.
        Resultado Esperado: O sistema deve criar apenas 1 Exame e agrupar os 2 arquivos dentro dele.
        """
        import os # Garantimos que o módulo os está disponível
        url_upload = reverse('upload_exame')
        hoje = timezone.now().date().isoformat()
        
        # 👇 A MÁGICA 1: Simulamos a variável de ambiente do servidor
        os.environ['ROBO_WORKLIST_TOKEN'] = 'senha_secreta_do_robo_123'
        
        # O Django Test Client exige que headers customizados comecem com HTTP_
        headers_seguranca = {'HTTP_X_API_KEY': 'senha_secreta_do_robo_123'}
        
        # 1º UPLOAD: Primeira Imagem
        imagem1 = SimpleUploadedFile("foto_rin.jpg", b"conteudo_falso", content_type="image/jpeg")
        payload1 = {
            "nome_pasta_original": "USG_ABDOMEN_MARIA",
            "nome_paciente": "Maria da Silva",
            "data_exame": hoje,
            "arquivos": imagem1 
        }
        
        # 👇 A MÁGICA 2: Injetamos o header no POST
        response1 = self.client.post(url_upload, payload1, format='multipart', **headers_seguranca)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED, f"Erro no 1º upload: {response1.data}")
        
        # 2º UPLOAD: Segunda Imagem milissegundos depois
        imagem2 = SimpleUploadedFile("foto_figado.jpg", b"conteudo_falso", content_type="image/jpeg")
        payload2 = {
            "nome_pasta_original": "USG_ABDOMEN_MARIA",
            "nome_paciente": "Maria da Silva",
            "data_exame": hoje,
            "arquivos": imagem2 
        }
        
        # 👇 A MÁGICA 3: Injetamos o header no segundo POST também
        response2 = self.client.post(url_upload, payload2, format='multipart', **headers_seguranca)
        
        self.assertEqual(response2.status_code, status.HTTP_200_OK, f"Erro no 2º upload: {response2.data}")
        self.assertEqual(response2.data.get('acao'), 'atualizado', "A API não marcou a ação como 'atualizado'")
        
        # A Prova de Ouro: O banco deve ter apenas 1 exame e 2 imagens vinculadas!
        total_exames = Exame.objects.filter(nome_paciente_pasta="USG_ABDOMEN_MARIA").count()
        self.assertEqual(total_exames, 1, "O sistema duplicou o exame em vez de agrupar as imagens!")