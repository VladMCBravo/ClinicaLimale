# core/pdf_services.py

import io
import os
from django.conf import settings
from pypdf import PdfReader, PdfWriter

def aplicar_mascara_padrao(pdf_bytes_originais):
    """
    Recebe os bytes de um PDF qualquer (texto transparente gerado pelo sistema)
    e aplica a máscara padrão da clínica (Receituario.pdf) no fundo de todas as páginas.
    """
    # 1. Caminho absoluto para a máscara da clínica
    caminho_mascara = os.path.join(settings.BASE_DIR, 'static', 'Receituario.pdf')
    
    try:
        # 2. Carrega a máscara para a memória (uma única vez)
        with open(caminho_mascara, 'rb') as f_mascara:
            mascara_bytes = f_mascara.read()

        # 3. Lê o PDF original que o sistema acabou de gerar (Laudo, Receita, etc.)
        conteudo_reader = PdfReader(io.BytesIO(pdf_bytes_originais))
        writer = PdfWriter()
        
        # 4. Aplica a máscara em CADA PÁGINA do documento original
        for i in range(len(conteudo_reader.pages)):
            pagina_conteudo = conteudo_reader.pages[i]
            
            # Recarrega a página da máscara "limpa" da memória
            mascara_reader = PdfReader(io.BytesIO(mascara_bytes))
            pagina_mascara_limpa = mascara_reader.pages[0]
            
            # Mescla o conteúdo por cima da máscara e adiciona ao novo PDF
            pagina_mascara_limpa.merge_page(pagina_conteudo)
            writer.add_page(pagina_mascara_limpa)
            
        # 5. Salva e retorna o resultado final em bytes
        merged_result = io.BytesIO()
        writer.write(merged_result)
        
        return merged_result.getvalue()
        
    except FileNotFoundError:
        print("ERRO CRÍTICO: O arquivo static/Receituario.pdf não foi encontrado!")
        # Se a máscara não for encontrada, devolve o PDF original para não travar a clínica
        return pdf_bytes_originais
        
    except Exception as e:
        print(f"Erro ao aplicar máscara no PDF: {e}")
        # Retorna o original em caso de qualquer outra falha
        return pdf_bytes_originais