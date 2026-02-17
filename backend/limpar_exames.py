import os
import django

# Configuração do ambiente Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from exames.models import Exame
from django.db.models import Count

def gerenciar_duplicatas():
    # 1. Busca exames duplicados (mesma pasta e data)
    duplicados = (
        Exame.objects.values('nome_paciente_pasta', 'data_exame')
        .annotate(qtd=Count('id'))
        .filter(qtd__gt=1)
    )

    if not duplicados:
        print("✅ Nenhuma duplicata encontrada no banco de dados.")
        return

    for item in duplicados:
        nome = item['nome_paciente_pasta']
        data = item['data_exame']
        
        # Busca todas as instâncias desse exame
        instancias = Exame.objects.filter(nome_paciente_pasta=nome, data_exame=data).order_by('id')
        
        print(f"\n--- ⚠️  DUPLICATA ENCONTRADA: {nome} ---")
        print(f"Data do Exame: {data}")
        
        for i, inst in enumerate(instancias):
            # Removido 'data_criacao' para evitar erro de atributo
            print(f"[{i}] Registro ID: {inst.id}")

        print("\nComandos: [0, 1...] Deletar índice | [U] Unificar (deleta os outros) | [P] Pular")
        escolha = input("Sua escolha: ").strip().upper()

        if escolha == 'U':
            manter = instancias[0]
            para_remover = instancias[1:]
            print(f"-> Mantendo ID {manter.id} e removendo duplicatas...")
            for inst_velha in para_remover:
                id_antigo = inst_velha.id
                inst_velha.delete()
                print(f"   🗑️  ID {id_antigo} removido.")
            print("✅ Concluído.")
            
        elif escolha.isdigit():
            idx = int(escolha)
            if idx < len(instancias):
                id_del = instancias[idx].id
                instancias[idx].delete()
                print(f"🗑️  Registro ID {id_del} deletado.")
            else:
                print("❌ Índice inválido.")
        else:
            print("⏭️  Pulado.")

if __name__ == "__main__":
    gerenciar_duplicatas()