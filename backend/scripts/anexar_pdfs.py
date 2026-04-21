import os
import django
import uuid

# Configuração do Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from pacientes.models import Paciente
from prontuario.models import Laudo
from django.core.files import File

def anexar_pdfs_ao_prontuario():
    print("\n=== 📎 INICIANDO UPLOAD EM MASSA DE PDFS ===\n")
    
    pasta_pdfs = 'pdfs_antigos'
    
    if not os.path.exists(pasta_pdfs):
        print(f"❌ A pasta '{pasta_pdfs}' não existe.")
        return

    arquivos = [f for f in os.listdir(pasta_pdfs) if f.endswith('.pdf')]
    sucessos = 0
    ignorados = 0

    for arquivo in arquivos:
        caminho_completo = os.path.join(pasta_pdfs, arquivo)
        
        # Pega o ID no nome do arquivo (ex: "184_maria.pdf" -> 184)
        nome_sem_extensao = arquivo.replace('.pdf', '')
        paciente_id_str = nome_sem_extensao.split('_')[0]
        
        try:
            paciente_id = int(paciente_id_str)
            paciente = Paciente.objects.get(id=paciente_id)
        except (ValueError, Paciente.DoesNotExist):
            print(f"⏭️ Ignorando '{arquivo}': Paciente não encontrado.")
            continue

        # Verifica se já tem o laudo de importação
        ja_anexado = Laudo.objects.filter(
            paciente=paciente, 
            titulo_exame="Exames Anexados (Importação)"
        ).exists()
        
        if ja_anexado:
            print(f"⏭️ Ignorando '{arquivo}': O PDF JÁ ESTÁ anexado.")
            ignorados += 1
            continue

        try:
            # 1. CRIA E SALVA O LAUDO PRIMEIRO (Para gerar um ID no banco)
            codigo_unico = f"IMP-{uuid.uuid4().hex[:6].upper()}"
            
            novo_laudo = Laudo(
                paciente=paciente,
                titulo_exame="Exames Anexados (Importação)",
                texto_laudo="Laudo antigo importado em lote para o prontuário eletrônico.",
                codigo_acesso=codigo_unico
            )
            novo_laudo.save() # <--- SALVA PRIMEIRO! A mágica acontece aqui.

            # 2. ABRE O ARQUIVO E SALVA DIRETAMENTE NO CAMPO arquivo_pdf
            with open(caminho_completo, 'rb') as f:
                # O método .save() do campo FileField faz o upload físico e atualiza o banco
                novo_laudo.arquivo_pdf.save(arquivo, File(f))

            sucessos += 1
            print(f"✅ Anexado com sucesso: Prontuário de {paciente.nome_completo}")

        except Exception as e:
            # Se der erro ao subir o PDF, ele apaga o laudo que criamos para não sujar o sistema
            if 'novo_laudo' in locals() and novo_laudo.id:
                novo_laudo.delete()
            print(f"❌ Erro ao anexar '{arquivo}': {e}")

    print("\n" + "="*60)
    print(f"🎉 UPLOAD CONCLUÍDO!")
    print(f"📍 Novos PDFs anexados fisicamente: {sucessos}")
    print(f"📍 Ignorados: {ignorados}")
    print("="*60 + "\n")

if __name__ == '__main__':
    anexar_pdfs_ao_prontuario()