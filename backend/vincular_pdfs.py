import os
import django
import uuid

# Configuração do Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from pacientes.models import Paciente
from prontuario.models import Laudo
from django.contrib.auth import get_user_model

User = get_user_model()

def vincular_pdfs():
    print("\n=== 🔗 VINCULANDO CAMINHOS DOS PDFS NO BANCO (SQL VIA ORM) ===\n")
    
    pasta_pdfs = 'pdfs_antigos'
    arquivos = [f for f in os.listdir(pasta_pdfs) if f.endswith('.pdf')]
    
    # Pega o usuário admin (que vimos no seu log que é o Vladmir) ou o primeiro médico
    medico_padrao = User.objects.filter(cargo='admin').first() or User.objects.first()
    
    if not medico_padrao:
        print("❌ Nenhum médico/admin encontrado no banco de dados para assinar o laudo.")
        return

    sucessos = 0
    ignorados = 0

    for arquivo in arquivos:
        nome_sem_extensao = arquivo.replace('.pdf', '')
        paciente_id_str = nome_sem_extensao.split('_')[0]
        
        try:
            paciente = Paciente.objects.get(id=int(paciente_id_str))
            
            # Trava para não duplicar se você rodar duas vezes
            ja_anexado = Laudo.objects.filter(paciente=paciente, titulo_exame="Exames Anexados (Importação)").exists()
            if ja_anexado:
                print(f"⏭️ {arquivo}: Já vinculado.")
                ignorados += 1
                continue

            # --- A CORREÇÃO DO CAMINHO ESTÁ AQUI ---
            # Adicionamos a pasta "exames/" que estava faltando no trajeto
            caminho_no_supabase = f"exames/laudos_importados/{arquivo}"
            # ---------------------------------------
            
            # 1. Monta o registro SQL na memória
            novo_laudo = Laudo(
                paciente=paciente,
                medico=medico_padrao,
                titulo_exame="Exames Anexados (Importação)",
                texto_laudo="Laudo antigo importado em lote para o prontuário eletrônico.",
                codigo_acesso=f"IMP-{uuid.uuid4().hex[:6].upper()}",
            )
            
            # 2. A MÁGICA: Apenas salvamos o texto do caminho na propriedade .name. 
            # Ao fazer isso, o Django NÃO tenta acionar a nuvem e focar apenas no banco de dados.
            novo_laudo.arquivo_pdf.name = caminho_no_supabase
            
            # 3. Dispara o INSERT INTO no SQL
            novo_laudo.save()
            
            sucessos += 1
            print(f"✅ Registrado: {paciente.nome_completo} -> aponta para '{caminho_no_supabase}'")

        except Exception as e:
            print(f"❌ Erro ao vincular '{arquivo}': {e}")

    print(f"\n🎉 CONCLUÍDO! {sucessos} laudos gravados no SQL com sucesso.")
    print("⚠️ Lembrete: Certifique-se de que os PDFs já estão na pasta 'laudos_importados' no Supabase.\n")

if __name__ == '__main__':
    vincular_pdfs()