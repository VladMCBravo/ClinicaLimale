# backend/core/services_assinatura.py
import io
from pyhanko.sign import signers, fields
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from cryptography.hazmat.primitives.serialization import pkcs12

def assinar_pdf_digitalmente(pdf_bytes, usuario_medico):
    """
    Recebe os bytes de um PDF e o objeto User do médico.
    Retorna os bytes do PDF assinado ou levanta erro se falhar.
    """
    if not hasattr(usuario_medico, 'certificado') or not usuario_medico.certificado.arquivo_p12:
        print(f"Médico {usuario_medico} não possui certificado A1 configurado.")
        return pdf_bytes

    cert_obj = usuario_medico.certificado
    
    try:
        # 1. Recupera a senha descriptografada e garante formato de bytes
        senha = cert_obj.get_password()
        if not senha:
            raise ValueError("Não foi possível recuperar a senha do certificado.")
        senha_bytes = senha.encode('utf-8')

        # 2. LÊ O CONTEÚDO DO ARQUIVO (Funciona com S3, Cloudinary ou FileSystem)
        with cert_obj.arquivo_p12.open('rb') as f:
            p12_data = f.read()

        # 3. EXTRAI AS CHAVES DA MEMÓRIA 
        private_key, certificate, additional_certs = pkcs12.load_key_and_certificates(
            p12_data, 
            senha_bytes
        )

        # 4. INSTANCIA O SIGNER MANUALMENTE (A forma correta quando as chaves já foram extraídas)
        signer = signers.SimpleSigner(
            signing_cert=certificate,
            signing_key=private_key,
            cert_registry=additional_certs
        )

        # 5. Prepara o PDF para assinatura incremental
        pdf_stream = io.BytesIO(pdf_bytes)
        w = IncrementalPdfFileWriter(pdf_stream)

        # 6. Cria o campo de assinatura invisível corretamente
        sig_field_spec = fields.SigFieldSpec(
            sig_field_name='Assinatura_ICP_Brasil',
            on_page=0, 
            box=(0, 0, 0, 0)
        )
        fields.append_signature_field(w, sig_field_spec)

        # 7. Realiza a assinatura final conectando ao campo criado
        meta = signers.PdfSignatureMetadata(field_name='Assinatura_ICP_Brasil')
        
        out = io.BytesIO()
        signers.sign_pdf(
            w, meta,
            signer=signer, output=out,
        )
        
        print(f"Sucesso: PDF assinado digitalmente para {usuario_medico.get_full_name()}")
        return out.getvalue()

    except Exception as e:
        print(f"Erro técnico na assinatura digital: {str(e)}")
        raise e