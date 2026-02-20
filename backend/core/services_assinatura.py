# backend/core/services_assinatura.py
import io
from pyhanko.sign import signers, fields
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign.fields import SigSeedSubFilter

def assinar_pdf_digitalmente(pdf_bytes, usuario_medico):
    """
    Recebe os bytes de um PDF e o objeto User do médico.
    Retorna os bytes do PDF assinado ou o PDF original se der erro.
    """
    if not hasattr(usuario_medico, 'certificado') or not usuario_medico.certificado.arquivo_p12:
        print(f"Médico {usuario_medico} não possui certificado A1 configurado.")
        return pdf_bytes

    cert_obj = usuario_medico.certificado
    
    try:
        # 1. Recupera a senha descriptografada
        senha = cert_obj.get_password()
        if not senha:
            raise ValueError("Não foi possível recuperar a senha do certificado.")

        # 2. LÊ O CONTEÚDO DO ARQUIVO (Funciona com Supabase/S3)
        # Em vez de usar .path, usamos .open().read() para pegar os bytes
        with cert_obj.arquivo_p12.open('rb') as f:
            p12_data = f.read()

        # 3. Configura o assinante (Signer) usando os bytes em memória
        # Trocamos P12Signer por uma carga manual para maior controle
        from cryptography.hazmat.primitives.serialization import pkcs12
        
        private_key, certificate, additional_certs = pkcs12.load_key_and_certificates(
            p12_data,
            senha.encode()
        )

        signer = signers.SimpleSigner(
            signing_cert=certificate,
            signing_key=private_key,
            cert_registry=additional_certs
        )

        # 4. Prepara o PDF para assinatura incremental
        pdf_stream = io.BytesIO(pdf_bytes)
        w = IncrementalPdfFileWriter(pdf_stream)

        # 5. Adiciona o campo de assinatura invisível (padrão ICP-Brasil)
        fields.append_signature_field(
            w, SigSeedSubFilter.ADOBE_PKCS7_DETACHED
        )

        # 6. Realiza a assinatura final
        out = io.BytesIO()
        signers.sign_pdf(
            w, signers.PdfSignatureMetadata(field_name='Signature1'),
            signer=signer, output=out,
        )
        
        print(f"Sucesso: PDF assinado digitalmente para {usuario_medico.get_full_name()}")
        return out.getvalue()

    except Exception as e:
        print(f"Erro técnico na assinatura digital: {str(e)}")
        # Retorna o PDF original para não travar o fluxo do médico
        return pdf_bytes