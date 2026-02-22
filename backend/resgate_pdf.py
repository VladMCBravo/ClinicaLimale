import os
import django
import re
from datetime import datetime, timedelta

# Configuração do Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from pacientes.models import Paciente
from crm.models import Ciclo
import PyPDF2

def ler_pdfs_e_atualizar_crm():
    print("\n=== 🤖 INICIANDO ROBÔ LEITOR DE PDFS ===\n")
    
    pasta_pdfs = 'pdfs_antigos'
    
    if not os.path.exists(pasta_pdfs):
        print(f"❌ A pasta '{pasta_pdfs}' não existe. Crie a pasta e coloque os PDFs lá.")
        return

    # Padrões de busca (Regex)
    padrao_ig = re.compile(r'(?i)(\d+)\s*(?:semanas?|sem|s|w)(?:\s*e\s*|\s+)?(?:(\d+)\s*(?:dias?|d))?')
    padrao_data = re.compile(r'(\d{2})[/-](\d{2})[/-](\d{4})')

    arquivos = [f for f in os.listdir(pasta_pdfs) if f.endswith('.pdf')]
    
    if not arquivos:
        print("⚠️ Nenhum arquivo PDF encontrado na pasta.")
        return

    sucessos = 0
    ignorados = 0

    for arquivo in arquivos:
        caminho_completo = os.path.join(pasta_pdfs, arquivo)
        
        # INTELIGÊNCIA DE NOME: "184_maria.pdf" vira apenas "184"
        nome_sem_extensao = arquivo.replace('.pdf', '')
        paciente_id_str = nome_sem_extensao.split('_')[0]
        
        try:
            paciente_id = int(paciente_id_str)
            paciente = Paciente.objects.get(id=paciente_id)
        except (ValueError, Paciente.DoesNotExist):
            print(f"⏭️ Ignorando '{arquivo}': O nome do arquivo não começa com um ID válido.")
            continue

        # --- A REGRA DE IGNORAR SE JÁ EXISTIR GESTAÇÃO ---
        # Verifica se o paciente já tem DUM. Se sim, pula a leitura do PDF inteira.
        if paciente.dum:
            print(f"⏭️ Ignorando '{arquivo}': A paciente {paciente.nome_completo} JÁ POSSUI gestação no sistema (DUM: {paciente.dum.strftime('%d/%m/%Y')}).")
            ignorados += 1
            continue

        try:
            # Abre e lê o PDF (só chega aqui se não tiver gestação)
            with open(caminho_completo, 'rb') as f:
                leitor = PyPDF2.PdfReader(f)
                texto_completo = ""
                for pagina in leitor.pages:
                    texto_completo += pagina.extract_text() + "\n"

            # 1. Procura a Idade Gestacional no texto
            match_ig = re.search(padrao_ig, texto_completo)
            # 2. Procura a Data do Exame no texto
            match_data = re.search(padrao_data, texto_completo)

            if match_ig and match_data:
                semanas = int(match_ig.group(1))
                dias = int(match_ig.group(2)) if match_ig.group(2) else 0
                
                dia = int(match_data.group(1))
                mes = int(match_data.group(2))
                ano = int(match_data.group(3))
                
                data_exame = datetime(ano, mes, dia).date()
                
                # ENGENHARIA REVERSA MATEMÁTICA
                dias_totais = (semanas * 7) + dias
                dum_calculada = data_exame - timedelta(days=dias_totais)

                # ATUALIZA O BANCO DE DADOS
                paciente.dum = dum_calculada
                paciente.save(update_fields=['dum'])
                
                ciclo = Ciclo.objects.filter(paciente=paciente, status='ativo').first()
                if ciclo and getattr(ciclo, 'data_dum', None) is None:
                    ciclo.data_dum = dum_calculada
                    ciclo.save(update_fields=['data_dum'])

                sucessos += 1
                print(f"✅ {paciente.nome_completo} (ID {paciente.id}) atualizada!")
                print(f"   -> Achou no PDF: {semanas}s e {dias}d no dia {data_exame.strftime('%d/%m/%Y')}")
                print(f"   -> DUM Salva no CRM: {dum_calculada.strftime('%d/%m/%Y')}")
            else:
                print(f"❌ Falha no '{arquivo}': Não encontrei Idade Gestacional ou Data no texto do PDF.")

        except Exception as e:
            print(f"Erro ao processar '{arquivo}': {e}")

    print("\n" + "="*60)
    print(f"🎉 LEITURA CONCLUÍDA!")
    print(f"📍 Sucessos (Novas gestações salvas): {sucessos}")
    print(f"📍 Ignorados (Já tinham gestação): {ignorados}")
    print("="*60 + "\n")

if __name__ == '__main__':
    ler_pdfs_e_atualizar_crm()