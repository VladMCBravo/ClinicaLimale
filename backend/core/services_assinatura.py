# backend/core/services_assinatura.py

import io
from pyhanko.sign import signers, fields
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign.fields import SigSeedSubFilter
from django.core.files.storage import default_storage

def assinar_pdf_digitalmente(pdf_bytes, usuario_medico):
    """
    Recebe os bytes de um PDF e o objeto User do médico.
    Retorna os bytes do PDF assinado ou o PDF original se der erro/não tiver certificado.
    """
    
    # 1. Verifica se o médico tem certificado
    if not hasattr(usuario_medico, 'certificado'):
        print(f"Médico {usuario_medico} não possui certificado A1 configurado.")
        return pdf_bytes # Retorna sem assinar

    cert_obj = usuario_medico.certificado
    
    try:
        # 2. Carrega o arquivo P12 e a senha
        p12_path = cert_obj.arquivo_p12.path
        p12_password = cert_obj.get_password().encode() # Precisa ser bytes

        # 3. Configura o assinante (Signer)
        signer = signers.P12Signer(
            load_key=True,
            pfx_file=p12_path,
            passphrase=p12_password
        )

        # 4. Prepara o PDF para assinatura
        # PyHanko exige um objeto de arquivo (stream)
        pdf_stream = io.BytesIO(pdf_bytes)
        w = IncrementalPdfFileWriter(pdf_stream)

        # 5. Adiciona o campo de assinatura (invisível ou visível)
        # Aqui faremos uma assinatura criptográfica padrão (invisível visualmente, mas válida no Adobe/Gov.br)
        # Se quiser "Estampa Visual", a configuração é mais complexa, podemos ver depois.
        fields.append_signature_field(
            w, SigSeedSubFilter.ADOBE_PKCS7_DETACHED
        )

        # 6. Realiza a assinatura
        out = io.BytesIO()
        signers.sign_pdf(
            w, signers.PdfSignatureMetadata(field_name='Signature1'),
            signer=signer, output=out,
        )
        
        return out.getvalue()

    except Exception as e:
        print(f"Erro ao assinar PDF: {e}")
        # Em caso de erro (senha errada, arquivo corrompido), retorna o PDF original sem assinar
        # para não travar o sistema
        return pdf_bytes