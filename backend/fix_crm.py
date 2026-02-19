import os
import sys
import django
import json

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings') 

try:
    django.setup()
    print("✅ Django configurado.")
except Exception as e:
    print(f"❌ Erro: {e}")
    sys.exit(1)

from prontuario.models import Laudo

def atualizar_tudo():
    # Pegamos TODOS os laudos para não correr o risco de ignorar variações de nome
    laudos = Laudo.objects.all()
    print(f"--- Analisando {laudos.count()} laudos no total ---")
    
    sucessos = 0
    pulados = 0

    for l in laudos:
        # Verificamos se o laudo tem os dados estruturados do seu formulário
        dados = l.dados_estruturados
        if isinstance(dados, str):
            try: dados = json.loads(dados)
            except: dados = {}
        
        # O seu sistema salva os dados em 'feto1'
        if not dados or 'feto1' not in dados:
            # print(f"ℹ️ {l.paciente.nome_completo}: Pulado (Não é laudo obstétrico estruturado)")
            pulados += 1
            continue

        try:
            l.sincronizar_crm()
            print(f"✅ {l.paciente.nome_completo}: Sincronizado")
            sucessos += 1
        except Exception as e:
            print(f"❌ {l.paciente.nome_completo}: Erro ({e})")

    print(f"\n--- Processamento Finalizado ---")
    print(f"Sincronizados: {sucessos}")
    print(f"Laudos de outros tipos ignorados: {pulados}")

if __name__ == "__main__":
    atualizar_tudo()