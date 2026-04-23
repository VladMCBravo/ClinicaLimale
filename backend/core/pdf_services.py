# core/pdf_services.py

import io
import os
from django.conf import settings
from pypdf import PdfReader, PdfWriter

def aplicar_mascara_padrao(pdf_bytes_originais):
    """
    Recebe os bytes de um PDF qualquer e aplica a máscara padrão (Receituario.pdf) no fundo.
    Otimizado para não estourar a memória RAM do servidor (Prevenção de OOM Kill).
    """
    caminho_mascara = os.path.join(settings.BASE_DIR, 'static', 'Receituario.pdf')
    
    try:
        # 1. Carrega o conteúdo original (O Laudo pesadão gerado pelo React)
        conteudo_reader = PdfReader(io.BytesIO(pdf_bytes_originais))
        
        # 2. Carrega a máscara (Apenas UMA ÚNICA VEZ fora do loop)
        mascara_reader = PdfReader(caminho_mascara)
        pagina_mascara = mascara_reader.pages[0]
        
        writer = PdfWriter()
        
        # 3. Mescla página por página de forma inteligente
        for pagina_conteudo in conteudo_reader.pages:
            
            # --- O PULO DO GATO (OVER=FALSE) ---
            # Injeta a máscara POR BAIXO do texto, consumindo muito menos RAM
            pagina_conteudo.merge_page(pagina_mascara, over=False)
            
            writer.add_page(pagina_conteudo)
            
        # 4. Salva e retorna os bytes
        merged_result = io.BytesIO()
        writer.write(merged_result)
        
        return merged_result.getvalue()
        
    except FileNotFoundError:
        print("ERRO CRÍTICO: O arquivo static/Receituario.pdf não foi encontrado!")
        return pdf_bytes_originais
        
    except Exception as e:
        print(f"Erro ao aplicar máscara no PDF: {e}")
        return pdf_bytes_originais