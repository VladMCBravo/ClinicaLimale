import os
import django

# Configuração do ambiente Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.admin.models import LogEntry
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
try:
    from faturamento.models import Pagamento
except ImportError:
    print("Erro ao importar o modelo Pagamento.")
    exit()

User = get_user_model()

def investigar_logs_especificos():
    print("\n" + "="*65)
    print(" 🕵️‍♂️ RAIO-X INVESTIGATIVO: DIAS 01/04/2026 E 02/04/2026 ")
    print("="*65 + "\n")

    try:
        pagamento_ct = ContentType.objects.get_for_model(Pagamento)
        
        # Filtrando logs do admin apenas para os dias 1 e 2 de Abril de 2026
        logs = LogEntry.objects.filter(
            content_type=pagamento_ct,
            action_time__year=2026,
            action_time__month=4,
            action_time__day__in=[1, 2]
        ).order_by('-action_time')
        
        print("📜 1. ALTERAÇÕES FEITAS DENTRO DO PAINEL DJANGO ADMIN NESTES DIAS:\n")
        
        if not logs.exists():
            print("   ✅ NENHUMA alteração foi feita pelo painel do Django Admin nestas datas.")
            print("   (Isso comprova que os pagamentos foram baixados exclusivamente pelo Frontend/React)")
        else:
            for log in logs:
                nome_usuario = log.user.get_full_name() or log.user.username
                print(f"   🕒 Data/Hora: {log.action_time.strftime('%d/%m/%Y %H:%M:%S')}")
                print(f"   👤 Quem alterou: ID {log.user.id} ({nome_usuario})")
                print(f"   🧾 Pagamento Alterado: ID {log.object_id}")
                print(f"   📝 O que mudou: {log.change_message}")
                print(f"   " + "-"*40)
                
        print("\n" + "="*65)
        print(" 👥 2. MAPA DE USUÁRIOS (ID -> NOME) NO SISTEMA")
        print("="*65 + "\n")
        
        usuarios = User.objects.all().order_by('id')
        for u in usuarios:
            nome = f"{u.first_name} {u.last_name}".strip() or u.username
            cargo = getattr(u, 'cargo', 'Sem cargo') # Tenta puxar o cargo se existir
            print(f"   ID: {u.id:02d} | Nome: {nome.ljust(30)} | Usuário de login: {u.username}")

    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    investigar_logs_especificos()