import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from prontuario.models import Laudo
from django.db.models import Count

def limpar_laudos_duplicados():
    # Busca exames que possuem mais de um laudo vinculado (se a restrição unique permitir)
    # Ou simplesmente identifica se o laudo que você está tentando criar já existe
    dups = Laudo.objects.values('exame_id').annotate(qtd=Count('id')).filter(qtd__gt=1)
    
    if not dups:
        print("✅ Nenhum laudo duplicado encontrado no banco.")
        return

    for item in dups:
        eid = item['exame_id']
        instancias = Laudo.objects.filter(exame_id=eid).order_by('id')
        print(f"⚠️ Exame ID {eid} possui {item['qtd']} laudos.")
        # Mantém o primeiro, deleta os outros
        for i in range(1, len(instancias)):
            instancias[i].delete()
            print(f"   🗑️ Laudo duplicado removido.")

if __name__ == "__main__":
    limpar_laudos_duplicados()