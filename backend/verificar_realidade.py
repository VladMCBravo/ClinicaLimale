import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def varrer_tudo():
    with connection.cursor() as cursor:
        # Verifica a tabela nova
        cursor.execute("SELECT COUNT(*) FROM laudos_laudo")
        total_novo = cursor.fetchone()[0]
        
        # Verifica a tabela antiga
        cursor.execute("SELECT COUNT(*) FROM prontuario_laudo")
        total_antigo = cursor.fetchone()[0]
        
    print(f"\n--- RELATÓRIO DE DADOS ---")
    print(f"Laudos na tabela NOVA (laudos_laudo): {total_novo}")
    print(f"Laudos na tabela ANTIGA (prontuario_laudo): {total_antigo}")
    print(f"--------------------------\n")

    if total_antigo > 0 and total_novo == 0:
        print("🚨 DESCOBERTO: Seus laudos estão na tabela antiga (prontuario_laudo)!")
        print("Você precisará de um script de migração de 'prontuario' para 'laudos'.")

if __name__ == "__main__":
    varrer_tudo()