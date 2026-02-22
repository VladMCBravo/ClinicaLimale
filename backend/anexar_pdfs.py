import os
import django
import uuid # <--- ADICIONE ISTO AQUI NO TOPO

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
        
        # Inteligência para pegar o ID no nome do arquivo
        nome_sem_extensao = arquivo.replace('.pdf', '')
        paciente_id_str = nome_sem_extensao.split('_')[0]
        
        try:
            paciente_id = int(paciente_id_str)
            paciente = Paciente.objects.get(id=paciente_id)
        except (ValueError, Paciente.DoesNotExist):
            print(f"⏭️ Ignorando '{arquivo}': Paciente não encontrado.")
            continue

        # --- 🛡️ A REGRA DE SEPARAÇÃO: EVITAR DUPLICATAS ---
        # Verifica se já existe um laudo de importação salvo para essa paciente
        ja_anexado = Laudo.objects.filter(
            paciente=paciente, 
            titulo_exame="Exames Anexados (Importação)"
        ).exists()
        
        if ja_anexado:
            print(f"⏭️ Ignorando '{arquivo}': O PDF de {paciente.nome_completo} JÁ ESTÁ anexado no prontuário.")
            ignorados += 1
            continue
        # --------------------------------------------------

        try:
            # 1. Abre o PDF fisicamente no disco do Mac
            with open(caminho_completo, 'rb') as f:
                arquivo_django = File(f, name=arquivo)
                
                # 2. Cria o registro do Laudo no Prontuário
                novo_laudo = Laudo(
                    paciente=paciente,
                    titulo_exame="Exames Anexados (Importação)",
                    texto_laudo="Laudo antigo importado em lote para o prontuário eletrônico."
                )
                
                # --- A CORREÇÃO DA LUANA: FORÇA UM CÓDIGO ÚNICO ---
                # Gera um código aleatório como "IMP-8A4F12"
                codigo_unico = f"IMP-{uuid.uuid4().hex[:6].upper()}"
                novo_laudo.codigo_acesso = codigo_unico
                # -------------------------------------------------

                # ⚠️ Verifique se 'arquivo_pdf' é o nome exato do campo no seu models.py
                novo_laudo.arquivo = arquivo_django 
                
                # 3. Salva no banco de dados
                novo_laudo.save()

                sucessos += 1
                print(f"✅ Anexado com sucesso: Prontuário de {paciente.nome_completo}")

        except Exception as e:
            print(f"❌ Erro ao anexar '{arquivo}': {e}")

    print("\n" + "="*60)
    print(f"🎉 UPLOAD CONCLUÍDO!")
    print(f"📍 Novos PDFs anexados: {sucessos}")
    print(f"📍 Ignorados (Já estavam no sistema): {ignorados}")
    print("="*60 + "\n")

if __name__ == '__main__':
    anexar_pdfs_ao_prontuario()