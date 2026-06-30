from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from agendamentos.models import Agendamento, Sala
from pacientes.models import Paciente
from faturamento.models import Pagamento, Procedimento
from usuarios.models import Especialidade
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class FinanceiroIntegridadeTests(APITestCase):
    
    def setUp(self):
        self.user_admin = User.objects.create_user(username='admin_fin', password='123', cargo='admin')
        self.paciente = Paciente.objects.create(nome_completo="Paciente Teste", cpf="00011122233", data_nascimento="1990-01-01")
        self.medico = User.objects.create_user(username='dr_financeiro', password='123', cargo='medico')
        self.sala = Sala.objects.create(nome="Consultório 1")
        
        self.esp = Especialidade.objects.create(nome="Clínica Geral", valor_consulta=250.00)
        self.proc_1 = Procedimento.objects.create(descricao="Exame de Sangue", valor_particular=100.00)
        self.proc_2 = Procedimento.objects.create(descricao="Ultrassom", valor_particular=300.00)
        
        self.url_agenda = reverse('lista-agendamentos')

    def test_admin_nao_deve_baixar_pagamento_automaticamente_se_tiver_valor(self):
        self.client.force_authenticate(user=self.user_admin)
        
        dados = {
            "paciente": self.paciente.id,
            "medico": self.medico.id,
            "sala": self.sala.id,
            "tipo_agendamento": "Consulta",
            "especialidade": self.esp.id,
            "data_hora_inicio": (timezone.now() + timedelta(days=2)).isoformat(),
            "data_hora_fim": (timezone.now() + timedelta(days=2, minutes=30)).isoformat()
        }
        
        response = self.client.post(self.url_agenda, dados)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Erro na API: {response.data}")
        
        # Correção: Em vez de ler do JSON, pegamos o agendamento recém-criado direto do banco de dados temporário
        agendamento = Agendamento.objects.filter(paciente=self.paciente).last()
        pagamento = Pagamento.objects.get(agendamento_id=agendamento.id)
        
        self.assertEqual(pagamento.status, 'Pendente')

    def test_integridade_valor_agendamento(self):
        """
        Valida se o faturamento criado tem o valor exato da especialidade/procedimento.
        Isso garante que o administrador não veja valores errados no financeiro.
        """
        self.client.force_authenticate(user=self.user_admin)
        
        dados = {
            "paciente": self.paciente.id,
            "medico": self.medico.id,
            "sala": self.sala.id,
            "tipo_agendamento": "Consulta",
            "especialidade": self.esp.id,
            "data_hora_inicio": (timezone.now() + timedelta(days=5)).isoformat(),
            "data_hora_fim": (timezone.now() + timedelta(days=5, minutes=30)).isoformat()
        }
        
        self.client.post(self.url_agenda, dados)
        
        # Busca o último pagamento gerado
        pagamento = Pagamento.objects.filter(paciente=self.paciente).last()
        
        # O valor deve ser exatamente os 250.00 que definimos no setUp para a especialidade
        self.assertEqual(float(pagamento.valor), 250.00, "O valor do faturamento está incorreto!")
        self.assertEqual(pagamento.status, 'Pendente')
    
    def test_cancelamento_anula_pagamento_pendente(self):
        """
        Cenário: A recepção altera o status do agendamento para 'Cancelado'.
        Resultado Esperado: O contas a receber atrelado a ele deve mudar de 'Pendente' para 'Cancelado'.
        Regra de Segurança: O sistema só pode cancelar pagamentos 'Pendentes' (se já foi pago, exige estorno).
        """
        self.client.force_authenticate(user=self.user_admin)
        
        # 1. SETUP: Criamos um agendamento inicial
        dados_agendamento = {
            "paciente": self.paciente.id,
            "medico": self.medico.id,
            "sala": self.sala.id,
            "tipo_agendamento": "Consulta",
            "especialidade": self.esp.id,
            "data_hora_inicio": (timezone.now() + timedelta(days=1)).isoformat(),
            "data_hora_fim": (timezone.now() + timedelta(days=1, minutes=30)).isoformat(),
            "status": "Agendado" # Status inicial
        }
        
        response_criacao = self.client.post(self.url_agenda, dados_agendamento)
        
        # 👇 CORREÇÃO 1: Garante que criou com sucesso (se falhar, imprime o motivo no terminal)
        self.assertEqual(
            response_criacao.status_code, 
            status.HTTP_201_CREATED, 
            f"Erro da API ao tentar criar o agendamento: {response_criacao.data}"
        )
        
        # 👇 CORREÇÃO 2: Pegamos o ID direto do banco, como você fez no outro teste!
        agendamento = Agendamento.objects.filter(paciente=self.paciente).last()
        agendamento_id = agendamento.id
        
        # Confirma que o pagamento nasceu Pendente
        pagamento = Pagamento.objects.get(agendamento_id=agendamento_id)
        self.assertEqual(pagamento.status, 'Pendente')

        # 2. AÇÃO: A recepção muda o status para 'Cancelado'
        url_detalhe = reverse('detalhe-agendamento', kwargs={'pk': agendamento_id})
        
        # 👇 CORREÇÃO: Copiamos os dados originais e mudamos apenas o status
        dados_cancelamento = dados_agendamento.copy()
        dados_cancelamento['status'] = 'Cancelado'
        
        # Enviamos um PUT (atualização completa) para satisfazer a segurança da API
        response_cancelamento = self.client.put(url_detalhe, dados_cancelamento)
        
        self.assertEqual(
            response_cancelamento.status_code, 
            status.HTTP_200_OK,
            f"A API recusou o cancelamento. Motivo: {response_cancelamento.data}"
        )

        # 3. VERIFICAÇÃO CRÍTICA (Onde o bug vivia)
        pagamento.refresh_from_db() # 👈 Atualiza o objeto com os novos dados do banco
        
        self.assertEqual(
            pagamento.status, 
            'Cancelado', 
            "FALHA FINANCEIRA: O paciente cancelou, mas a dívida continuou ativa no Contas a Receber!"
        )