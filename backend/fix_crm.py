import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings') # Ajuste se seu projeto tiver outro nome
django.setup()

from prontuario.models import Laudo

def atualizar_tudo():
    laudos = Laudo.objects.filter(tipo_exame__icontains='OBSTETRICO')
    print(f"--- Iniciando processamento de {laudos.count()} laudos ---")
    
    for l in laudos:
        print(f"Processando: {l.paciente.nome_completo}...", end=" ")
        try:
            l.sincronizar_crm() # Dispara a nova lógica que criamos no Passo 1
            print("✅ Sucesso")
        except:
            print("❌ Erro")

if __name__ == "__main__":
    atualizar_tudo()