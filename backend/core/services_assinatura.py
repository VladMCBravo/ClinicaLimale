# backend/core/services_assinatura.py
import io
import os
import tempfile
from pyhanko.sign import signers, fields
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter

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

        # 2. Lê os bytes do storage na nuvem (Supabase/S3)
        with cert_obj.arquivo_p12.open('rb') as f:
            p12_data = f.read()

        # 3. MÁGICA: Cria um arquivo físico temporário no servidor
        with tempfile.NamedTemporaryFile(delete=False, suffix=".p12") as tmp:
            tmp.write(p12_data)
            tmp_path = tmp.name # Guarda o caminho físico gerado (Ex: /tmp/arquivo.p12)

        try:
            # 4. Passa o caminho físico exato para o PyHanko (Resolve todos os erros!)
            signer = signers.SimpleSigner.load_pkcs12(
                pfx_file=tmp_path,
                passphrase=senha_bytes
            )

            # 5. Prepara o PDF para assinatura incremental
            pdf_stream = io.BytesIO(pdf_bytes)
            w = IncrementalPdfFileWriter(pdf_stream)

            # 6. Cria o campo de assinatura invisível
            sig_field_spec = fields.SigFieldSpec(
                sig_field_name='Assinatura_ICP_Brasil',
                on_page=0, 
                box=(0, 0, 0, 0)
            )
            fields.append_signature_field(w, sig_field_spec)

            # 7. Realiza a assinatura
            meta = signers.PdfSignatureMetadata(field_name='Assinatura_ICP_Brasil')
            
            out = io.BytesIO()
            signers.sign_pdf(
                w, meta,
                signer=signer, output=out,
            )
            
            print(f"Sucesso: PDF assinado digitalmente para {usuario_medico.get_full_name()}")
            return out.getvalue()
            
        finally:
            # 8. SEGURANÇA: Garante que o certificado temporário seja deletado do servidor
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except Exception as e:
        print(f"Erro técnico na assinatura digital: {str(e)}")
        raise e