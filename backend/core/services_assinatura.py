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
        # 1. Recupera a senha descriptografada
        senha = cert_obj.get_password()
        if not senha:
            raise ValueError("Não foi possível recuperar a senha do certificado.")

        # 2. LÊ O CONTEÚDO DO ARQUIVO (Funciona com Supabase/S3)
        with cert_obj.arquivo_p12.open('rb') as f:
            p12_data = f.read()

        # 3. Configura o assinante (Signer) usando os bytes em memória
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

        # 5. CORREÇÃO: Cria o campo de assinatura invisível corretamente
        sig_field_spec = fields.SigFieldSpec(
            sig_field_name='Assinatura_ICP_Brasil',
            on_page=0, # Página 1 (índice 0)
            box=(0, 0, 0, 0) # Coordenadas 0,0,0,0 criam uma assinatura invisível
        )
        fields.append_signature_field(w, sig_field_spec)

        # 6. Realiza a assinatura final conectando ao campo criado
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
        # MUDANÇA CRÍTICA: Lançamos a exceção. 
        # É melhor o laudo cair para o status 'ERRO' (permitindo ao médico tentar de novo)
        # do que gerar um documento que parece assinado, mas não tem validade legal.
        raise e