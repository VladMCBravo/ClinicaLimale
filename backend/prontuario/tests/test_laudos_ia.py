# backend/prontuario/tests/test_laudos_ia.py

import pytest
import json
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from pacientes.models import Paciente
from prontuario.models import Laudo
from prontuario.tasks import processar_laudo_background

User = get_user_model()

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def medico_ultrassonografista(db):
    user, _ = User.objects.get_or_create(
        username='dr_ultra',
        defaults={'cargo': 'medico', 'crm': '123456'}
    )
    user.set_password('senha_segura')
    user.save()
    return user

@pytest.fixture
def paciente_teste(db):
    paciente, _ = Paciente.objects.get_or_create(
        nome_completo="Maria Silva",
        defaults={'data_nascimento': "1990-05-10", 'genero': "Feminino"}
    )
    return paciente

@pytest.mark.django_db
class TestFluxoAuditoriaLaudo:

    # MOCK 1: Impede o Django de tentar fazer upload real na AWS S3
    @patch('django.core.files.storage.default_storage.save', return_value='exame.pdf')
    # MOCK 2: Intercepta o transaction.on_commit, já que transações de teste sofrem rollback
    @patch('django.db.transaction.on_commit')
    def test_01_view_assincrona_cria_laudo_status_processando(self, mock_on_commit, mock_storage, client, medico_ultrassonografista, paciente_teste):
        """
        Garante que a View aceita o form-data, valida a senha e salva como PROCESSANDO.
        """
        client.force_authenticate(user=medico_ultrassonografista)
        url = '/api/prontuario/laudos-async/' 
        
        pdf_falso = SimpleUploadedFile("exame.pdf", b"file_content", content_type="application/pdf")
        
        payload = {
            'paciente': paciente_teste.id,
            'titulo': 'USG Transvaginal',
            'texto_laudo': 'Útero e ovários sem alterações.',
            'medico_responsavel': 'Dr. Ultra',
            'crm_medico': '123456',
            'senha_medico': 'senha_segura',
            'dados_estruturados': json.dumps({"sexo": "Feminino"}),
            'arquivo_pdf': pdf_falso
        }
        
        response = client.post(url, payload, format='multipart')
        
        assert response.status_code == status.HTTP_202_ACCEPTED
        
        laudo_salvo = Laudo.objects.first()
        assert laudo_salvo is not None
        assert laudo_salvo.status == 'PROCESSANDO'
        assert laudo_salvo.medico == medico_ultrassonografista
        assert mock_on_commit.called is True  # Garante que a view agendou a tarefa background

    @patch('prontuario.tasks.connection.close')
    @patch('prontuario.tasks.auditar_coerencia_laudo')
    def test_02_task_background_barrada_pela_ia(self, mock_auditoria, mock_conn_close, db, medico_ultrassonografista, paciente_teste):
        """
        Simula a Thread rodando. O Mock do Claude retorna erro e o Laudo 
        deve mudar para REVISAO_SUGERIDA.
        """
        laudo = Laudo.objects.create(
            paciente=paciente_teste,
            medico=medico_ultrassonografista,
            status='PROCESSANDO',
            texto_laudo='Ovário direito normal.',
            dados_estruturados={"lateralidade_medida": "Esquerdo"}
        )

        mock_auditoria.return_value = {
            "aprovado": False,
            "discrepancias": [{"campo": "Lateralidade", "aviso": "Divergência detectada pelo Claude."}]
        }

        processar_laudo_background(laudo.id)
        
        laudo.refresh_from_db()
        assert laudo.status == 'REVISAO_SUGERIDA'
        assert len(laudo.feedback_auditoria) == 1

    # MOCKS DA AWS S3: Impede o 'read()', 'seek()' e 'save()' de chamarem a nuvem!
    @patch('django.db.models.fields.files.FieldFile.read', return_value=b"dummy_bytes")
    @patch('django.db.models.fields.files.FieldFile.seek')
    @patch('django.db.models.fields.files.FieldFile.save')
    # MOCKS DE PROCESSAMENTO DE PDF E BANCO:
    @patch('prontuario.tasks.connection.close')
    @patch('prontuario.tasks.assinar_pdf_digitalmente')
    @patch('prontuario.tasks.aplicar_mascara_padrao')
    def test_03_task_background_ignora_ia_se_flag_enviada(self, mock_mascara, mock_assinatura, mock_conn_close, mock_file_save, mock_file_seek, mock_file_read, db, medico_ultrassonografista, paciente_teste):
        """
        Garante que quando o médico clica em 'Ignorar e Assinar', o backend pula
        o Claude e emite o PDF imediatamente.
        """
        pdf_falso = SimpleUploadedFile("exame.pdf", b"dummy_bytes", content_type="application/pdf")
        
        laudo = Laudo.objects.create(
            paciente=paciente_teste,
            medico=medico_ultrassonografista,
            status='PROCESSANDO',
            arquivo_pdf=pdf_falso,
            dados_estruturados={"ignorar_auditoria_ia": True} # FLAG QUE BURLA A IA
        )

        mock_mascara.return_value = b"pdf_timbrado"
        mock_assinatura.return_value = b"pdf_assinado_criptograficamente"

        processar_laudo_background(laudo.id)

        laudo.refresh_from_db()
        assert laudo.status == 'FINALIZADO'
        assert mock_mascara.called is True