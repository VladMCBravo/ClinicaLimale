from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from agendamentos.models import Sala, Agendamento
from pacientes.models import Paciente
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class AgendamentoConflitosTests(APITestCase):
    
    def setUp(self):
        # 1. Criação dos atores
        self.user_recepcao = User.objects.create_user(username='recepcao_agenda', password='123', cargo='recepcao')
        self.medico = User.objects.create_user(username='dr_house', password='123', cargo='medico')
        
        # 2. Criação do Recurso Físico
        self.sala = Sala.objects.create(nome="Sala 01 - Ultrassom", e_sala_exame=True)
        
        # 3. Criação de dois pacientes distintos
        self.paciente_1 = Paciente.objects.create(nome_completo="João da Silva", cpf="11111111111", data_nascimento="1990-01-01")
        self.paciente_2 = Paciente.objects.create(nome_completo="Maria Souza", cpf="22222222222", data_nascimento="1995-05-05")
        
        self.url = reverse('lista-agendamentos')
        
        # 4. Controle de Tempo Meticuloso (Amanhã ao meio-dia)
        agora = timezone.now()
        self.amanha_12h00 = agora.replace(hour=12, minute=0, second=0, microsecond=0) + timedelta(days=1)
        self.amanha_12h30 = self.amanha_12h00 + timedelta(minutes=30)
        
        # 5. Criamos o agendamento original que ocupará a sala
        self.agendamento_existente = Agendamento.objects.create(
            paciente=self.paciente_1,
            medico=self.medico,
            sala=self.sala,
            tipo_agendamento='Consulta',
            data_hora_inicio=self.amanha_12h00,
            data_hora_fim=self.amanha_12h30
        )

    def test_bloqueio_de_conflito_de_sala_exato(self):
        """
        Cenário: Tentar marcar paciente 2 na mesma sala e exatamente no mesmo horário do paciente 1.
        Resultado: Erro 400 Bad Request, a sala já está ocupada.
        """
        self.client.force_authenticate(user=self.user_recepcao)
        
        dados_invasores = {
            "paciente": self.paciente_2.id,
            "medico": self.medico.id,
            "sala": self.sala.id,
            "tipo_agendamento": "Consulta",
            "data_hora_inicio": self.amanha_12h00.isoformat(),
            "data_hora_fim": self.amanha_12h30.isoformat()
        }
        
        response = self.client.post(self.url, dados_invasores)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Verifica se o serializer cuspiu a mensagem correta interceptando o erro na 'sala'
        self.assertIn("já está ocupada", str(response.data))

    def test_sucesso_ao_forcar_encaixe(self):
        """
        Cenário: Tentar marcar paciente 2 no mesmo horário, MAS ativando o "is_encaixe".
        Resultado: O sistema permite a sobreposição e retorna 201 Created.
        """
        self.client.force_authenticate(user=self.user_recepcao)
        
        dados_encaixe = {
            "paciente": self.paciente_2.id,
            "medico": self.medico.id,
            "sala": self.sala.id,
            "tipo_agendamento": "Consulta",
            "data_hora_inicio": self.amanha_12h00.isoformat(),
            "data_hora_fim": self.amanha_12h30.isoformat(),
            "is_encaixe": True # A bandeira mágica
        }
        
        response = self.client.post(self.url, dados_encaixe)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

class AgendamentoRegrasNegocioTests(APITestCase):
    
    def setUp(self):
        self.user_recepcao = User.objects.create_user(username='recepcao_regras', password='123', cargo='recepcao')
        self.paciente = Paciente.objects.create(nome_completo="Paciente Passado", cpf="33333333333", data_nascimento="1980-01-01")
        self.medico = User.objects.create_user(username='dr_tempo', password='123', cargo='medico')
        self.url = reverse('lista-agendamentos')
        
        # Criamos uma data exata de 1 dia atrás
        self.ontem = timezone.now() - timedelta(days=1)

    def test_bloqueio_agendamento_no_passado(self):
        """
        Cenário: Tentar marcar uma consulta para ontem.
        Resultado Esperado: Erro 400 Bad Request bloqueando a viagem no tempo.
        """
        self.client.force_authenticate(user=self.user_recepcao)
        
        dados_passado = {
            "paciente": self.paciente.id,
            "medico": self.medico.id,
            "tipo_agendamento": "Consulta",
            "data_hora_inicio": self.ontem.isoformat(),
            "data_hora_fim": (self.ontem + timedelta(minutes=30)).isoformat()
        }
        
        response = self.client.post(self.url, dados_passado)
        
        # Nós ESPERAMOS que o sistema barre com um 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # E esperamos que a mensagem de erro tenha a palavra 'passado'
        self.assertIn("passado", str(response.data).lower())

    def test_admin_pode_agendar_no_passado(self):
            """
            Cenário: Admin tenta marcar uma consulta para ontem (regularização de agenda).
            Resultado Esperado: Sucesso (201 Created), pois a trava não se aplica a ele.
            """
            # Criamos o nosso usuário Administrador com a "chave mestra"
            user_admin = User.objects.create_user(username='chefe_admin', password='123', cargo='admin')
            self.client.force_authenticate(user=user_admin)
            
            dados_passado = {
                "paciente": self.paciente.id,
                "medico": self.medico.id,
                "tipo_agendamento": "Consulta",
                "data_hora_inicio": self.ontem.isoformat(),
                "data_hora_fim": (self.ontem + timedelta(minutes=30)).isoformat()
            }
            
            response = self.client.post(self.url, dados_passado)
            
            # O Admin TEM o poder da viagem no tempo, então esperamos sucesso 201
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

class AgendamentoPrivacidadeTests(APITestCase):
    
    def setUp(self):
        # 1. Criamos os dois médicos
        self.dr_alberto = User.objects.create_user(username='dr_alberto', password='123', cargo='medico')
        self.dr_bruno = User.objects.create_user(username='dr_bruno', password='123', cargo='medico')
        
        self.paciente = Paciente.objects.create(nome_completo="Paciente Sigiloso", cpf="99999999999", data_nascimento="1990-01-01")
        self.sala = Sala.objects.create(nome="Sala Padrão")
        
        agora = timezone.now()
        
        # 2. Criamos um agendamento para o Dr. Alberto
        Agendamento.objects.create(
            paciente=self.paciente,
            medico=self.dr_alberto,
            sala=self.sala,
            tipo_agendamento='Consulta',
            data_hora_inicio=agora + timedelta(days=2),
            data_hora_fim=agora + timedelta(days=2, minutes=30),
            observacoes="Consulta Exclusiva do Alberto"
        )
        
        # 3. Criamos um agendamento para o Dr. Bruno
        Agendamento.objects.create(
            paciente=self.paciente,
            medico=self.dr_bruno,
            sala=self.sala,
            tipo_agendamento='Consulta',
            data_hora_inicio=agora + timedelta(days=3),
            data_hora_fim=agora + timedelta(days=3, minutes=30),
            observacoes="Consulta Exclusiva do Bruno"
        )
        
        self.url = reverse('lista-agendamentos')

    def test_medico_so_ve_sua_propria_agenda_na_lista_geral(self):
        """
        Cenário: Dr. Alberto acessa a lista geral de agendamentos.
        Resultado Esperado: Ele deve ver sua consulta, mas a consulta do Bruno deve ser ocultada.
        """
        # Forçamos o login como Dr. Alberto
        self.client.force_authenticate(user=self.dr_alberto)
        
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Confirma que a consulta dele está lá
        self.assertContains(response, "Consulta Exclusiva do Alberto")
        
        # AQUI O TESTE VAI QUEBRAR: O sistema não deve expor a consulta do Bruno
        self.assertNotContains(response, "Consulta Exclusiva do Bruno")