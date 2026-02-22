import os
import django

# Configuração do ambiente Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from exames.models import Exame, ArquivoExame
from django.db.models import Count

def gerenciar_duplicatas():
    # Agora buscamos duplicatas baseadas no PACIENTE e na DATA, ignorando o nome da pasta
    duplicados = (
        Exame.objects.values('paciente_id', 'data_exame')
        .annotate(qtd=Count('id'))
        .filter(qtd__gt=1, paciente_id__isnull=False) # Só pega exames que já tem paciente vinculado
    )

    if not duplicados:
        print("✅ Nenhuma duplicata encontrada no banco de dados para o mesmo paciente e data.")
        return

    for item in duplicados:
        pid = item['paciente_id']
        data = item['data_exame']
        
        # Busca todas as instâncias desse exame para o mesmo paciente
        instancias = Exame.objects.filter(paciente_id=pid, data_exame=data).order_by('id')
        
        # Pega o nome do paciente para facilitar a visualização
        paciente_nome = instancias[0].paciente.nome_completo if instancias[0].paciente else "Desconhecido"
        
        print(f"\n--- ⚠️ EXAMES DUPLICADOS ENCONTRADOS: {paciente_nome} ---")
        print(f"Data do Exame: {data}")
        
        for i, inst in enumerate(instancias):
            qtd_arquivos = inst.arquivos.count() # Conta quantos arquivos tem vinculados
            print(f"[{i}] ID: {inst.id} | Status: {inst.status} | Pasta: {inst.nome_paciente_pasta} | Arquivos: {qtd_arquivos}")

        print("\nComandos:")
        print("[0, 1...] Escolha o número do exame que deseja MANTER (os arquivos dos outros serão transferidos para ele)")
        print("[P] Pular")
        
        escolha = input("Sua escolha: ").strip().upper()

        if escolha.isdigit():
            idx = int(escolha)
            if 0 <= idx < len(instancias):
                manter = instancias[idx]
                para_remover = [inst for j, inst in enumerate(instancias) if j != idx]
                
                print(f"\n-> Mantendo ID {manter.id} e movendo arquivos das duplicatas...")
                for inst_velha in para_remover:
                    id_antigo = inst_velha.id
                    
                    # 1. Transfere os arquivos para o exame principal
                    ArquivoExame.objects.filter(exame=inst_velha).update(exame=manter)
                    
                    # 2. Deleta o exame antigo
                    inst_velha.delete()
                    print(f"   🗑️ Exame ID {id_antigo} deletado e arquivos unificados no ID {manter.id}.")
                print("✅ Concluído.")
            else:
                print("❌ Índice inválido.")
        else:
            print("⏭️ Pulado.")

if __name__ == "__main__":
    gerenciar_duplicatas()