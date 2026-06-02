# prontuario/tasks.py

import io
from celery import shared_task
from django.core.files.base import ContentFile
from django.db import connection # Importante para fechar a conexão da Thread
from .models import Laudo
from core.pdf_services import aplicar_mascara_padrao
from core.services_assinatura import assinar_pdf_digitalmente

# Remova o @shared_task, já que não estamos mais usando Celery
def processar_laudo_background(laudo_id):
    """
    Tarefa assíncrona usando Threading nativo.
    """
    print(f"[THREAD] Iniciando processamento do Laudo ID: {laudo_id}")
    
    try:
        # 1. Busca o laudo no banco de dados
        laudo = Laudo.objects.get(id=laudo_id)
        
        if not laudo.arquivo_pdf:
            raise ValueError("O laudo não possui um arquivo PDF base anexado.")
            
        # 2. Lê os bytes do arquivo original que o React enviou
        laudo.arquivo_pdf.seek(0)
        pdf_bytes_originais = laudo.arquivo_pdf.read()
        
        # 3. Aplica a máscara padrão
        print(f"[THREAD] Aplicando máscara no Laudo ID: {laudo_id}...")
        pdf_timbrado_bytes = aplicar_mascara_padrao(pdf_bytes_originais)
        
        # 4. Assina digitalmente
        print(f"[THREAD] Assinando digitalmente Laudo ID: {laudo_id}...")
        if laudo.medico and hasattr(laudo.medico, 'certificado') and laudo.medico.certificado.arquivo_p12:
            pdf_final_bytes = assinar_pdf_digitalmente(pdf_timbrado_bytes, laudo.medico)
        else:
            print(f"[THREAD] Médico sem certificado. Salvando apenas com máscara.")
            pdf_final_bytes = pdf_timbrado_bytes
            
        # 5. Salva o arquivo final de volta no modelo
        nome_arquivo_atual = laudo.arquivo_pdf.name.split('/')[-1]
        arquivo_final = ContentFile(pdf_final_bytes, name=nome_arquivo_atual)
        
        # Sobrescreve o arquivo antigo e muda o status
        laudo.arquivo_pdf.save(nome_arquivo_atual, arquivo_final, save=False)
        laudo.status = 'FINALIZADO'
        laudo.save()
        
        # Atualiza o status do Exame vinculado, se existir
        if getattr(laudo, 'exame', None) and laudo.exame.status == 'PENDENTE':
            laudo.exame.status = 'DISPONIVEL'
            laudo.exame.save()
            
        print(f"[THREAD] ✅ Sucesso! Laudo ID {laudo_id} processado e finalizado.")
        
    except Exception as e:
        print(f"[THREAD] ❌ Erro Crítico ao processar Laudo ID {laudo_id}: {e}")
        # Garantia absoluta de que o status vai mudar para ERRO
        try:
            laudo_erro = Laudo.objects.get(id=laudo_id)
            laudo_erro.status = 'ERRO'
            laudo_erro.save()
        except Exception as fallback_error:
            print(f"[THREAD] ❌ Falha ao tentar salvar o status de ERRO: {fallback_error}")
            
    finally:
        # ISSO É OBRIGATÓRIO NO DJANGO AO USAR THREADS!
        # Sem isso, as conexões se acumulam e derrubam seu banco de dados no Render.
        connection.close()