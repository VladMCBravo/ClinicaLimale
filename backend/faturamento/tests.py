from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from agendamentos.models import Agendamento, Sala
from pacientes.models import Paciente
from faturamento.models import (
    Pagamento, Procedimento, TransacaoFinanceira, Convenio, PlanoConvenio,
    LoteFaturamento, CategoriaDespesa, Despesa,
)
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


class FaturamentoConsolidacaoTests(APITestCase):
    """
    Trava a decisão da auditoria financeira: 'Pagamento' é a fonte única de verdade
    da receita. Renegociação de dívida e baixa de lote de convênio não podem mais
    escrever em 'TransacaoFinanceira', senão o dinheiro some do Dashboard, do
    Contas a Receber e do LTV do CRM (que só sabem ler de 'Pagamento').
    """

    def setUp(self):
        self.user_admin = User.objects.create_user(username='admin_consolidacao', password='123', cargo='admin')
        self.paciente = Paciente.objects.create(nome_completo="Paciente Renegociação", cpf="10120120100", data_nascimento="1985-05-05")
        self.client.force_authenticate(user=self.user_admin)

    def test_renegociacao_grava_em_pagamento_nao_em_transacaofinanceira(self):
        original = Pagamento.objects.create(
            paciente=self.paciente, descricao="Ultrassom", valor=600.00,
            status='Pendente', data_vencimento=timezone.now().date(), registrado_por=self.user_admin
        )

        payload = {
            "ids_originais": [original.id],
            "paciente_id": self.paciente.id,
            "novas_parcelas": [
                {"valor": 300.00, "vencimento": timezone.now().date().isoformat(), "pago_agora": True, "forma_pagamento": "PIX"},
                {"valor": 300.00, "vencimento": (timezone.now().date() + timedelta(days=30)).isoformat(), "pago_agora": False},
            ]
        }

        response = self.client.post('/api/faturamento/transacoes/renegociar/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Erro: {response.data}")

        original.refresh_from_db()
        self.assertEqual(original.status, 'Renegociado')

        novas = Pagamento.objects.filter(paciente=self.paciente, descricao__startswith='Renegociação')
        self.assertEqual(novas.count(), 2)
        self.assertEqual(novas.filter(status='Pago').count(), 1)
        self.assertEqual(novas.filter(status='Pendente').count(), 1)

        self.assertEqual(
            TransacaoFinanceira.objects.count(), 0,
            "FALHA: a renegociação voltou a gravar em TransacaoFinanceira — a receita some do dashboard."
        )

    def test_baixa_lote_convenio_cria_pagamento_e_nao_transacaofinanceira(self):
        convenio = Convenio.objects.create(nome="Unimed Teste")
        lote = LoteFaturamento.objects.create(
            convenio=convenio, mes_referencia=timezone.now().date(), valor_total_lote=1000.00, status='Enviado'
        )

        payload = {"valor_pago": 950.00, "valor_glosa": 50.00, "data_pagamento": timezone.now().date().isoformat()}
        response = self.client.post(f'/api/faturamento/lotes/{lote.id}/baixar/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Erro: {response.data}")

        lote.refresh_from_db()
        self.assertEqual(lote.status, 'Pago com Glosa')

        pagamento_aporte = Pagamento.objects.filter(paciente__isnull=True, status='Pago', valor=950.00).last()
        self.assertIsNotNone(pagamento_aporte, "FALHA: a baixa do lote não gerou receita em Pagamento.")

        self.assertEqual(
            TransacaoFinanceira.objects.count(), 0,
            "FALHA: a baixa do lote voltou a gravar em TransacaoFinanceira."
        )

    def test_lancamento_avulso_persiste_receita_no_banco(self):
        """
        Antes da correção, esse endpoint era um stub: respondia sucesso ('Receita
        lançada!') mas não salvava nada — perda silenciosa de dado financeiro.
        """
        payload = {
            "descricao": "Venda avulsa de produto",
            "valor": 300.00,
            "qtd_parcelas": 3,
            "data_vencimento": timezone.now().date().isoformat(),
            "forma_pagamento": "PIX",
            "status": "Pendente",
            "paciente": None,
        }
        response = self.client.post('/api/faturamento/lancamento-avulso/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Erro: {response.data}")

        criados = Pagamento.objects.filter(descricao__startswith="Venda avulsa de produto")
        self.assertEqual(criados.count(), 3, "FALHA: o lançamento avulso não persistiu as parcelas no banco.")
        total = sum(float(p.valor) for p in criados)
        self.assertAlmostEqual(total, 300.00, places=2)

    def test_agendamentos_faturaveis_exige_status_realizado(self):
        """
        Faturar um convênio por um atendimento que ainda nem aconteceu é um risco
        real (o agendamento pode ser cancelado depois de já faturado).
        """
        convenio = Convenio.objects.create(nome="Bradesco Teste")
        plano = PlanoConvenio.objects.create(convenio=convenio, nome="Plano Básico")
        medico = User.objects.create_user(username='dr_convenio', password='123', cargo='medico')
        sala = Sala.objects.create(nome="Sala Convênio")

        agora = timezone.now()
        ag_realizado = Agendamento.objects.create(
            paciente=self.paciente, medico=medico, sala=sala, tipo_agendamento='Consulta',
            tipo_atendimento='Convenio', plano_utilizado=plano,
            data_hora_inicio=agora, data_hora_fim=agora + timedelta(minutes=30), status='Realizado'
        )
        ag_agendado = Agendamento.objects.create(
            paciente=self.paciente, medico=medico, sala=sala, tipo_agendamento='Consulta',
            tipo_atendimento='Convenio', plano_utilizado=plano,
            data_hora_inicio=agora + timedelta(hours=2), data_hora_fim=agora + timedelta(hours=2, minutes=30), status='Agendado'
        )

        params = {"convenio_id": convenio.id, "mes": agora.month, "ano": agora.year}
        response = self.client.get('/api/faturamento/agendamentos-faturaveis/', params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ids_retornados = [item['id'] for item in response.data]
        self.assertIn(ag_realizado.id, ids_retornados)
        self.assertNotIn(
            ag_agendado.id, ids_retornados,
            "FALHA: um agendamento que ainda não aconteceu apareceu como faturável ao convênio."
        )


class RelatoriosFinanceirosTests(APITestCase):
    """
    Cobre os endpoints de Relatório Financeiro e Projeção de Caixa, que eram
    stubs (retornavam {'msg': 'OK'} sem nenhum dado real).
    """

    def setUp(self):
        self.user_admin = User.objects.create_user(username='admin_relatorios', password='123', cargo='admin')
        self.client.force_authenticate(user=self.user_admin)
        self.paciente = Paciente.objects.create(nome_completo="Paciente Relatório", cpf="20220220200", data_nascimento="1992-02-02")
        hoje = timezone.now().date()

        Pagamento.objects.create(
            paciente=self.paciente, descricao="Consulta paga", valor=250.00, status='Pago',
            forma_pagamento='PIX', data_pagamento=hoje, data_vencimento=hoje, registrado_por=self.user_admin
        )
        categoria = CategoriaDespesa.objects.create(nome="Aluguel Teste", tipo='Fixa')
        Despesa.objects.create(categoria=categoria, descricao="Aluguel", valor=1000.00, data_despesa=hoje, pago=True, data_pagamento=hoje)

    def test_relatorio_financeiro_retorna_dados_reais_e_serializaveis(self):
        response = self.client.get('/api/faturamento/relatorios/financeiro/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Erro: {response.data}")

        self.assertIn('faturamento_por_forma', response.data)
        self.assertIn('despesas_por_categoria', response.data)
        self.assertIn('fluxo_caixa_mensal', response.data)

        item_forma = response.data['faturamento_por_forma'][0]
        self.assertEqual(item_forma['forma_pagamento'], 'PIX')
        # Antes da correção isso vinha como Decimal (virava string no JSON) em vez de float.
        self.assertIsInstance(item_forma['total'], float)
        self.assertEqual(item_forma['total'], 250.00)

        item_despesa = response.data['despesas_por_categoria'][0]
        self.assertEqual(item_despesa['categoria_nome'], 'Aluguel Teste')
        self.assertEqual(item_despesa['total'], 1000.00)

    def test_projecao_fluxo_caixa_retorna_series_completas(self):
        response = self.client.get('/api/faturamento/projecao-caixa/', {"dias": 10})
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Erro: {response.data}")

        for chave in ['labels', 'saldo_projetado', 'receitas_previstas', 'despesas_previstas']:
            self.assertIn(chave, response.data)
            self.assertEqual(len(response.data[chave]), 11)  # hoje + 10 dias