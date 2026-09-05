# backend/prontuario/tests_tasks.py (ou adicionar no tests.py mesmo)
import pytest
from django.core.files.base import ContentFile
from unittest.mock import patch
from prontuario.tasks import processar_laudo_background

@pytest.mark.django_db
class TestProcessarLaudoBackground:

    @patch('prontuario.tasks.assinar_pdf_digitalmente')
    @patch('prontuario.tasks.aplicar_mascara_padrao')
    @patch('prontuario.tasks.auditar_coerencia_laudo')
    def test_finaliza_com_sucesso_quando_ia_aprova(
        self, mock_auditoria, mock_mascara, mock_assinatura, laudo_rascunho
    ):
        mock_auditoria.return_value = {'aprovado': True}
        mock_mascara.return_value = b"pdf_com_mascara"
        mock_assinatura.return_value = b"pdf_assinado"

        laudo_rascunho.dados_estruturados = {}
        laudo_rascunho.arquivo_pdf.save(
            'teste.pdf', ContentFile(b"pdf_original"), save=True
        )

        processar_laudo_background(laudo_rascunho.id)

        laudo_rascunho.refresh_from_db()
        assert laudo_rascunho.status == 'FINALIZADO'
        mock_assinatura.assert_called_once()

    @patch('prontuario.tasks.auditar_coerencia_laudo')
    def test_marca_revisao_sugerida_quando_ia_reprova(self, mock_auditoria, laudo_rascunho):
        mock_auditoria.return_value = {
            'aprovado': False,
            'discrepancias': [{'campo': 'Lateralidade', 'aviso': 'teste'}]
        }
        laudo_rascunho.dados_estruturados = {}
        laudo_rascunho.save()

        processar_laudo_background(laudo_rascunho.id)

        laudo_rascunho.refresh_from_db()
        assert laudo_rascunho.status == 'REVISAO_SUGERIDA'
        assert len(laudo_rascunho.feedback_auditoria) == 1

    @patch('prontuario.tasks.auditar_coerencia_laudo')
    def test_marca_erro_se_nao_tiver_pdf_base(self, mock_auditoria, laudo_rascunho):
        """laudo.arquivo_pdf vazio deve resultar em status ERRO, não em crash silencioso."""
        mock_auditoria.return_value = {'aprovado': True}
        laudo_rascunho.dados_estruturados = {}
        laudo_rascunho.save()
        # laudo_rascunho não tem arquivo_pdf anexado -> deve cair no ValueError do tasks.py

        processar_laudo_background(laudo_rascunho.id)

        laudo_rascunho.refresh_from_db()
        assert laudo_rascunho.status == 'ERRO'

    @patch('prontuario.tasks.aplicar_mascara_padrao', side_effect=Exception("Falha simulada"))
    @patch('prontuario.tasks.auditar_coerencia_laudo')
    def test_marca_erro_se_mascara_falhar(self, mock_auditoria, mock_mascara, laudo_rascunho):
        mock_auditoria.return_value = {'aprovado': True}
        laudo_rascunho.dados_estruturados = {}
        laudo_rascunho.arquivo_pdf.save('teste.pdf', ContentFile(b"pdf_original"), save=True)

        processar_laudo_background(laudo_rascunho.id)

        laudo_rascunho.refresh_from_db()
        assert laudo_rascunho.status == 'ERRO'