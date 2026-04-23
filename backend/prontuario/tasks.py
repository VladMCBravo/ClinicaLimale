# prontuario/tasks.py

import io
from celery import shared_task
from django.core.files.base import ContentFile
from .models import Laudo
from core.pdf_services import aplicar_mascara_padrao
from core.services_assinatura import assinar_pdf_digitalmente

@shared_task
def processar_laudo_background(laudo_id):
    """
    Tarefa assíncrona executada pelo Celery.
    Pega um laudo recém-salvo, aplica a máscara, assina digitalmente 
    e atualiza o status para FINALIZADO.
    """
    print(f"[CELERY] Iniciando processamento do Laudo ID: {laudo_id}")
    
    try:
        # 1. Busca o laudo no banco de dados
        laudo = Laudo.objects.get(id=laudo_id)
        
        # Verifica se tem um arquivo PDF base para processar
        if not laudo.arquivo_pdf:
            raise ValueError("O laudo não possui um arquivo PDF base anexado.")
            
        # 2. Lê os bytes do arquivo original que o React enviou
        laudo.arquivo_pdf.seek(0)
        pdf_bytes_originais = laudo.arquivo_pdf.read()
        
        # 3. Aplica a máscara padrão (usando nosso novo serviço central)
        print(f"[CELERY] Aplicando máscara no Laudo ID: {laudo_id}...")
        pdf_timbrado_bytes = aplicar_mascara_padrao(pdf_bytes_originais)
        
        # 4. Assina digitalmente
        print(f"[CELERY] Assinando digitalmente Laudo ID: {laudo_id}...")
        if laudo.medico and hasattr(laudo.medico, 'certificado') and laudo.medico.certificado.arquivo_p12:
            pdf_final_bytes = assinar_pdf_digitalmente(pdf_timbrado_bytes, laudo.medico)
        else:
            print(f"[CELERY] Médico sem certificado. Salvando apenas com máscara.")
            pdf_final_bytes = pdf_timbrado_bytes
            
        # 5. Salva o arquivo final de volta no modelo
        nome_arquivo_atual = laudo.arquivo_pdf.name.split('/')[-1]
        
        # Usamos ContentFile para salvar bytes como um arquivo no Django/Supabase
        arquivo_final = ContentFile(pdf_final_bytes, name=nome_arquivo_atual)
        
        # Sobrescreve o arquivo antigo e muda o status
        laudo.arquivo_pdf.save(nome_arquivo_atual, arquivo_final, save=False)
        laudo.status = 'FINALIZADO'
        laudo.save()
        
        # Atualiza o status do Exame vinculado, se existir
        if laudo.exame and laudo.exame.status == 'PENDENTE':
            laudo.exame.status = 'DISPONIVEL'
            laudo.exame.save()
            
        print(f"[CELERY] ✅ Sucesso! Laudo ID {laudo_id} processado e finalizado.")
        return True
        
    except Exception as e:
        print(f"[CELERY] ❌ Erro ao processar Laudo ID {laudo_id}: {e}")
        # Em caso de falha, volta para rascunho para o médico tentar novamente
        if 'laudo' in locals():
            laudo.status = 'ERRO'
            laudo.save()
        return False