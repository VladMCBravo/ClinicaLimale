from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.management import call_command
from agendamentos.models import Sala, Agendamento
from pacientes.models import Paciente
from faturamento.models import Pagamento
from usuarios.models import Especialidade
from crm.models import Ciclo
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
        self.assertIn("já tem um paciente", str(response.data))

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
        
        # 👇 CORREÇÃO 1: Mudamos de 1 dia para 3 dias atrás, forçando o bloqueio das 48h
        self.data_retroativa = timezone.now() - timedelta(days=3)

    def test_bloqueio_agendamento_no_passado(self):
        """
        Cenário: Tentar marcar uma consulta para 3 dias atrás (fora da janela de 48h).
        Resultado Esperado: Erro 400 Bad Request bloqueando o agendamento retroativo.
        """
        self.client.force_authenticate(user=self.user_recepcao)
        
        dados_passado = {
            "paciente": self.paciente.id,
            "medico": self.medico.id,
            "tipo_agendamento": "Consulta",
            "data_hora_inicio": self.data_retroativa.isoformat(),
            "data_hora_fim": (self.data_retroativa + timedelta(minutes=30)).isoformat()
        }
        
        response = self.client.post(self.url, dados_passado)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # 👇 CORREÇÃO 2: A nova mensagem da API usa a palavra "retroativa"
        self.assertIn("retroativa", str(response.data).lower())

    def test_admin_pode_agendar_no_passado(self):
        """
        Cenário: Admin tenta marcar uma consulta para 3 dias atrás (regularização de agenda).
        Resultado Esperado: Sucesso (201 Created), pois a trava das 48h não se aplica a ele.
        """
        user_admin = User.objects.create_user(username='chefe_admin', password='123', cargo='admin')
        self.client.force_authenticate(user=user_admin)
        
        dados_passado = {
            "paciente": self.paciente.id,
            "medico": self.medico.id,
            "tipo_agendamento": "Consulta",
            "data_hora_inicio": self.data_retroativa.isoformat(),
            "data_hora_fim": (self.data_retroativa + timedelta(minutes=30)).isoformat()
        }
        
        response = self.client.post(self.url, dados_passado)
        
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


class AgendamentoFinanceiroAutomacaoTests(APITestCase):
    """
    Cobre a costura entre Agendamento -> Pagamento -> CRM que vive nos signals.
    Esses testes existem para travar duas correções da auditoria financeira:
    1. O robô de cancelamento por expiração não pode mais deixar cobrança fantasma.
    2. A isenção de cobrança precisa zerar e já baixar o pagamento corretamente.
    """

    def setUp(self):
        self.user_admin = User.objects.create_user(username='admin_automacao', password='123', cargo='admin')
        self.paciente = Paciente.objects.create(nome_completo="Paciente Automação", cpf="55566677788", data_nascimento="1990-01-01")
        self.medico = User.objects.create_user(username='dr_automacao', password='123', cargo='medico')
        self.sala = Sala.objects.create(nome="Sala Automação")
        self.esp = Especialidade.objects.create(nome="Clínica Geral Automação", valor_consulta=200.00)
        self.url_agenda = reverse('lista-agendamentos')

    def test_cancelamento_por_expiracao_dispara_signals_financeiro_e_crm(self):
        """
        Cenário: um agendamento com prazo de pagamento (expira_em) vencido é varrido
        pelo robô "cancelar_agendamentos_expirados".
        Resultado esperado: o Agendamento vira 'Cancelado', o Pagamento 'Pendente'
        atrelado também vira 'Cancelado' e o Ciclo do CRM entra em recuperação (F5).

        Antes da correção, o comando usava queryset.update() em massa, que NÃO
        dispara post_save — deixando a cobrança pendente ativa para sempre (inflando
        "a receber"/"atrasado") e o CRM nunca acionava a cadência de recuperação.
        """
        agendamento = Agendamento.objects.create(
            paciente=self.paciente,
            medico=self.medico,
            sala=self.sala,
            tipo_agendamento='Consulta',
            especialidade=self.esp,
            data_hora_inicio=timezone.now() + timedelta(days=1),
            data_hora_fim=timezone.now() + timedelta(days=1, minutes=30),
            status='Agendado',
            expira_em=timezone.now() - timedelta(minutes=5),  # prazo já vencido
        )

        pagamento = Pagamento.objects.get(agendamento=agendamento)
        self.assertEqual(pagamento.status, 'Pendente')

        ciclo = Ciclo.objects.get(paciente=self.paciente)
        self.assertNotEqual(ciclo.fase_atual, 'F5')

        call_command('cancelar_agendamentos_expirados')

        agendamento.refresh_from_db()
        pagamento.refresh_from_db()
        ciclo.refresh_from_db()

        self.assertEqual(agendamento.status, 'Cancelado')
        self.assertEqual(
            pagamento.status, 'Cancelado',
            "FALHA FINANCEIRA: o robô cancelou o agendamento mas a cobrança pendente continuou ativa."
        )
        self.assertEqual(
            ciclo.fase_atual, 'F5',
            "FALHA CRM: o ciclo do paciente não entrou em recuperação após a expiração automática."
        )

    def test_isento_cobranca_zera_valor_e_da_baixa_automatica(self):
        """
        Cenário: a recepção marca o agendamento como isento de cobrança (ex: retorno gratuito).
        Resultado esperado: o Pagamento nasce com valor 0, já 'Pago' (não polui a fila de
        pendências da recepção) e com o motivo da isenção registrado na descrição.
        """
        self.client.force_authenticate(user=self.user_admin)

        dados = {
            "paciente": self.paciente.id,
            "medico": self.medico.id,
            "sala": self.sala.id,
            "tipo_agendamento": "Consulta",
            "especialidade": self.esp.id,
            "data_hora_inicio": (timezone.now() + timedelta(days=3)).isoformat(),
            "data_hora_fim": (timezone.now() + timedelta(days=3, minutes=30)).isoformat(),
            "isento_cobranca": "true",
            "motivo_isencao": "Retorno gratuito",
        }

        response = self.client.post(self.url_agenda, dados)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Erro na API: {response.data}")

        agendamento = Agendamento.objects.filter(paciente=self.paciente).last()
        pagamento = Pagamento.objects.get(agendamento=agendamento)

        self.assertEqual(float(pagamento.valor), 0.00)
        self.assertEqual(pagamento.status, 'Pago')
        self.assertIn('ISENTO', pagamento.descricao)