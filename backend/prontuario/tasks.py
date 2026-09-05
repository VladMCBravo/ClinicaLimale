# prontuario/tasks.py

import io
from celery import shared_task
from django.core.files.base import ContentFile
from django.db import connection # Importante para fechar a conexão da Thread
from .models import Laudo
from core.pdf_services import aplicar_mascara_padrao
from core.services_assinatura import assinar_pdf_digitalmente
from .services_auditoria import auditar_coerencia_laudo

# Remova o @shared_task, já que não estamos mais usando Celery
@shared_task
def processar_laudo_background(laudo_id):
    """
    Tarefa assíncrona via Celery.
    """
    print(f"[CELERY] Iniciando processamento do Laudo ID: {laudo_id}")
    
    try:
        laudo = Laudo.objects.get(id=laudo_id)
        
        # Flag que o frontend envia se o médico já viu os avisos e optou por ignorar
        ignorar_auditoria = laudo.dados_estruturados.get('ignorar_auditoria_ia', False)

        if not ignorar_auditoria:
            print(f"[THREAD] Executando auditoria do Claude no Laudo {laudo_id}...")
            resultado_ia = auditar_coerencia_laudo(
                dados_estruturados=laudo.dados_estruturados,
                texto_laudo=laudo.texto_laudo,
                tipo_exame=laudo.tipo_exame
            )

            if not resultado_ia.get('aprovado', True) and resultado_ia.get('discrepancias'):
                print(f"[THREAD] ⚠️ Discrepâncias encontradas pelo Claude no Laudo {laudo_id}!")
                laudo.status = 'REVISAO_SUGERIDA'
                laudo.feedback_auditoria = resultado_ia.get('discrepancias', [])
                laudo.save(update_fields=['status', 'feedback_auditoria'])
                return  # Interrompe o fluxo antes da assinatura
        
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