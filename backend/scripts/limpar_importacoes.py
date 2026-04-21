import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from prontuario.models import Laudo

def limpar():
    # Busca e apaga apenas os laudos gerados pelo nosso script
    laudos_com_erro = Laudo.objects.filter(titulo_exame="Exames Anexados (Importação)")
    quantidade = laudos_com_erro.count()
    
    laudos_com_erro.delete()
    print(f"\n✅ {quantidade} Laudos de importação vazios foram apagados com sucesso!\n")

if __name__ == '__main__':
    limpar()