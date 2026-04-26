from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from pacientes.models import Paciente
from prontuario.models import Laudo, Evolucao
from django.test import override_settings

User = get_user_model()

@override_settings(DEFAULT_FILE_STORAGE='django.core.files.storage.FileSystemStorage')
class LaudoSegurancaTests(APITestCase):

    def setUp(self):
        # 1. Criamos DOIS médicos diferentes
        self.medico1 = User.objects.create_user(username='dr_joao', password='123', cargo='medico')
        self.medico2 = User.objects.create_user(username='dr_pedro', password='123', cargo='medico')

        # 2. Criamos um paciente (AGORA COM DATA DE NASCIMENTO!)
        self.paciente = Paciente.objects.create(
            nome_completo="Maria da Silva", 
            cpf="12345678901",
            data_nascimento="1990-01-01" # <--- A LINHA QUE FALTAVA
        )

        # 3. Médico 1 cria um laudo que ainda é RASCUNHO
        self.laudo_rascunho = Laudo.objects.create(
            paciente=self.paciente,
            medico=self.medico1,
            titulo_exame="USG Obstétrico",
            status="RASCUNHO",
            texto_laudo="Feto único, vivo..."
        )

        # 4. Médico 1 cria um laudo que já está FINALIZADO (Assinado)
        self.laudo_finalizado = Laudo.objects.create(
            paciente=self.paciente,
            medico=self.medico1,
            titulo_exame="USG Morfológico",
            status="FINALIZADO",
            texto_laudo="Tudo normal com o bebê..."
        )

    def test_medico_nao_pode_editar_laudo_de_outro_medico(self):
        """
        Cenário: Dr. Pedro tenta editar o rascunho do Dr. João.
        Resultado Esperado: Bloqueio (Erro 403 Forbidden ou 404 Not Found).
        """
        self.client.force_authenticate(user=self.medico2) # Autenticando como o INVASOR
        url = reverse('detalhe-laudo', kwargs={'pk': self.laudo_rascunho.id})
        
        payload = {"texto_laudo": "Hacker alterou o texto do colega!"}
        response = self.client.patch(url, payload)

        # A API não pode de jeito nenhum devolver 200 OK!
        self.assertNotEqual(
            response.status_code, 
            status.HTTP_200_OK, 
            "FALHA DE SEGURANÇA: Um médico conseguiu editar o laudo de outro!"
        )

    def test_nao_permitir_edicao_de_laudo_finalizado(self):
        """
        Cenário: O médico tenta alterar um laudo dele mesmo, mas que já foi finalizado.
        Resultado Esperado: Bloqueio (Erro 400 Bad Request ou 403 Forbidden).
        """
        self.client.force_authenticate(user=self.medico1) # Autenticando como o DONO do laudo
        url = reverse('detalhe-laudo', kwargs={'pk': self.laudo_finalizado.id})
        
        payload = {"texto_laudo": "Vou alterar o diagnóstico semanas depois..."}
        response = self.client.patch(url, payload)

        # Um laudo finalizado é um documento legal imutável.
        self.assertNotEqual(
            response.status_code, 
            status.HTTP_200_OK, 
            "FALHA MÉDICO-LEGAL: O sistema permitiu alterar um laudo FINALIZADO!"
        )

class EvolucaoSegurancaTests(APITestCase):

    def setUp(self):
        # 1. Criamos DOIS médicos diferentes
        self.medico_dono = User.objects.create_user(username='dr_dono2', password='123', cargo='medico')
        self.medico_intruso = User.objects.create_user(username='dr_intruso2', password='123', cargo='medico')

        # 2. Criamos o paciente com os campos obrigatórios
        self.paciente = Paciente.objects.create(
            nome_completo="Carlos da Silva", 
            cpf="98765432100",
            data_nascimento="1980-05-05"
        )

        # 3. O Dr. Dono cria uma anotação no prontuário (USANDO notas_subjetivas)
        self.evolucao = Evolucao.objects.create(
            paciente=self.paciente,
            medico=self.medico_dono,
            notas_subjetivas="Paciente apresenta quadro de enxaqueca leve."
        )

    def test_medico_nao_pode_editar_evolucao_de_outro_medico(self):
        """
        Cenário: Dr. Intruso tenta alterar a anotação que o Dr. Dono fez.
        Resultado Esperado: Bloqueio imediato.
        """
        self.client.force_authenticate(user=self.medico_intruso)
        
        url = reverse('detalhe-evolucao', kwargs={'pk': self.evolucao.id})
        
        # Tentando alterar a queixa principal (usando o campo notas_subjetivas)
        payload = {"notas_subjetivas": "O paciente estava com suspeita de infarto, não avisei."}
        response = self.client.patch(url, payload)

        self.assertNotEqual(
            response.status_code, 
            status.HTTP_200_OK, 
            "FALHA GRAVE: O sistema permitiu que um médico editasse o prontuário do colega!"
        )

    def test_medico_nao_pode_deletar_evolucao_de_outro_medico(self):
        """
        Cenário: Dr. Intruso tenta deletar a anotação do colega para esconder um erro.
        Resultado Esperado: Bloqueio imediato.
        """
        self.client.force_authenticate(user=self.medico_intruso)
        url = reverse('detalhe-evolucao', kwargs={'pk': self.evolucao.id})
        
        response = self.client.delete(url)

        self.assertNotEqual(
            response.status_code, 
            status.HTTP_204_NO_CONTENT, 
            "FALHA GRAVE: O sistema permitiu apagar um registro médico de outro profissional!"
        )