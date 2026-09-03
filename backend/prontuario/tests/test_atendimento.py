import pytest
import json
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model
from pacientes.models import Paciente
from prontuario.models import Anamnese, Evolucao, Prescricao, ItemPrescricao, Atestado
from unittest.mock import patch

User = get_user_model()

# ==========================================
# FIXTURES BASE
# ==========================================

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def pediatra(db):
    return User.objects.create_user(
        username='dr_pediatra',
        password='123',
        cargo='medico',
        crm='999888'
    )

@pytest.fixture
def paciente_infantil(db):
    return Paciente.objects.create(
        nome_completo="Enzo Gabriel",
        data_nascimento="2025-01-01",
        genero="Masculino"
    )

# ==========================================
# SUÍTE DE TESTES: FLUXO DE ATENDIMENTO
# ==========================================

@pytest.mark.django_db
class TestFluxoAtendimentoPediatrico:

    def test_01_salvar_historico_pediatrico_dnpm(self, client, pediatra, paciente_infantil):
        """
        Simula a aba de Histórico Pediátrico salvando os dados vitais e o resumo do DNPM.
        Garante que o JSON aninhado é aceito e atualizado corretamente pelo PATCH.
        """
        client.force_authenticate(user=pediatra)
        
        # Cria a anamnese base silenciosamente (o GET do React costuma fazer isso)
        anamnese = Anamnese.objects.create(paciente=paciente_infantil, medico=pediatra)
        
        # Supondo que a URL aceite o ID do paciente (ajuste o kwargs conforme seu urls.py)
        url = reverse('detalhe-anamnese', kwargs={'paciente_id': paciente_infantil.id})
        
        # Payload idêntico ao que o React envia
        payload = {
            "pediatrica": {
                "tipo_parto": "Cesárea",
                "peso_nascimento": 3200,
                "dnpm": {
                    "dnpm_normal_idade": True,
                    "dnpm_sinais_alerta": False
                }
            }
        }
        
        response = client.patch(url, data=json.dumps(payload), content_type='application/json')
        
        # Asserções da API
        assert response.status_code == status.HTTP_200_OK, f"Erro ao salvar Anamnese: {response.data}"
        
        # Asserções no Banco de Dados
        anamnese.refresh_from_db()
        assert hasattr(anamnese, 'pediatrica'), "A relação AnamnesePediatria não foi criada!"
        assert anamnese.pediatrica.tipo_parto == "Cesárea"
        assert anamnese.pediatrica.peso_nascimento == 3200
        assert anamnese.pediatrica.dnpm.get('dnpm_normal_idade') is True

    def test_02_registrar_evolucao_clinica(self, client, pediatra, paciente_infantil):
        """
        Simula o médico escrevendo a evolução SOAP do dia (aba Evolução).
        """
        client.force_authenticate(user=pediatra)
        url = reverse('evolucoes-do-paciente', kwargs={'paciente_id': paciente_infantil.id})
        
        payload = {
            "notas_subjetivas": "Mãe relata febre leve há 2 dias.",
            "notas_objetivas": "BEG, corado, hidratado. Oroscopia sem hiperemia.",
            "avaliacao": "Quadro viral inespecífico.",
            "plano": "Sintomáticos e hidratação.",
            "peso": "12,5", # Testando a conversão de vírgula para ponto do serializer
            "especialidade_nome_fornecida": "Pediatria"
        }
        
        response = client.post(url, payload, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        evolucao_id = response.data['id']
        
        # Verifica se o serializer converteu a vírgula do peso corretamente
        evolucao_salva = Evolucao.objects.get(id=evolucao_id)
        assert evolucao_salva.peso == 12.5

    def test_03_prescrever_medicamento(self, client, pediatra, paciente_infantil):
        """
        Simula a aba de Prescrições gerando uma receita simples.
        """
        client.force_authenticate(user=pediatra)
        url = reverse('listar-criar-prescricoes', kwargs={'paciente_id': paciente_infantil.id})
        
        payload = {
            "titulo": "Receita Pediátrica",
            "itens": [
                {
                    "medicamento": "Dipirona Gotas 500mg/mL",
                    "via": "Oral",
                    "dosagem": "12 gotas",
                    "instrucoes": "De 6/6h em caso de febre ou dor."
                }
            ]
        }
        
        response = client.post(url, payload, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Prescricao.objects.filter(paciente=paciente_infantil).count() == 1
        assert ItemPrescricao.objects.filter(medicamento__icontains="Dipirona").exists()

    def test_04_emitir_atestado_comparecimento(self, client, pediatra, paciente_infantil):
        """
        Testa a emissão de um atestado médico usando a rota unificada.
        """
        client.force_authenticate(user=pediatra)
        url = reverse('atestados-do-paciente', kwargs={'paciente_id': paciente_infantil.id})
        
        payload = {
            "tipo_atestado": "Comparecimento",
            "observacoes": "Acompanhado da mãe durante o período da manhã.",
            "cid": "Z76.2",
            "paciente_autorizou_cid": True
        }
        
        response = client.post(url, payload, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        atestado = Atestado.objects.get(paciente=paciente_infantil)
        assert atestado.tipo_atestado == "Comparecimento"

    @patch('prontuario.views.pisa.pisaDocument')
    @patch('django.test.signals.template_rendered.send') # <--- ADICIONE ESTE PATCH
    def test_05_geracao_pdf_evolucao_integrada(self, mock_signal, mock_pisa, client, pediatra, paciente_infantil):
        """
        Testa se o endpoint de PDF da Evolução consegue ler todos os dados
        cadastrados nos testes anteriores e compilar o arquivo.
        """
        # Preparação: Garante que existe uma evolução para gerar o PDF
        evolucao = Evolucao.objects.create(
            paciente=paciente_infantil,
            medico=pediatra,
            notas_subjetivas="Teste de PDF",
            peso=12.5
        )
        
        # Configura o dublê do xhtml2pdf para não falhar
        mock_pisa.return_value.err = False
        
        client.force_authenticate(user=pediatra)
        
        url = reverse('gerar-evolucao-pdf', kwargs={'evolucao_id': evolucao.id}) 
        
        response = client.get(url)
        
        assert response.status_code == 200
        assert response['Content-Type'] == 'application/pdf'
        assert mock_pisa.called is True, "O gerador de HTML para PDF não foi invocado!"