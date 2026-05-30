import os
import sys
import django

# 1. Configuração do ambiente Django
caminho_script = os.path.dirname(os.path.abspath(__file__))
caminho_projeto = os.path.dirname(caminho_script)
sys.path.append(caminho_projeto)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from prontuario.models import Laudo

def executar_limpeza_segura():
    print("\n" + "="*60)
    print(" 🧹 INICIANDO VARREDURA DE LAUDOS FANTASMAS (MODO SEGURO) ")
    print("="*60 + "\n")

    # --- GRUPO 1: Laudos Automáticos do Robô ---
    laudos_robo = Laudo.objects.filter(titulo_exame__icontains="Exames Anexados (Auto)")
    total_robo = laudos_robo.count()

    # --- GRUPO 2: Laudos Vazios / Falhas de Múltiplos Cliques ---
    # Busca laudos sem PDF que não sejam do robô e que não estejam finalizados corretamente
    laudos_vazios = Laudo.objects.filter(
        arquivo_pdf__in=['', None]
    ).exclude(
        titulo_exame__icontains="Exames Anexados (Auto)"
    ).exclude(
        status='FINALIZADO'
    )
    total_vazios = laudos_vazios.count()

    print(f"🔍 Encontrados {total_robo} laudos automáticos do robô (Exames Anexados (Auto)).")
    print(f"🔍 Encontrados {total_vazios} rascunhos vazios/com erro (Sem PDF).\n")

    if total_robo == 0 and total_vazios == 0:
        print("✅ Seu banco de dados já está limpo! Nenhuma ação necessária.")
        return

    print("Deseja listar os IDs encontrados antes de apagar? (S/N)")
    listar = input("> ").strip().upper()

    if listar == 'S':
        print("\n--- LAUDOS DO ROBÔ ---")
        for l in laudos_robo:
            print(f"ID {l.id} | Paciente: {l.paciente.nome_completo.split()[0]} | Data: {l.data_criacao.strftime('%d/%m/%Y')}")
            
        print("\n--- RASCUNHOS VAZIOS/ERRO ---")
        for l in laudos_vazios:
            print(f"ID {l.id} | Paciente: {l.paciente.nome_completo.split()[0]} | Status: {l.status}")
    
    print("\n⚠️  ATENÇÃO: Você está prestes a excluir permanentemente esses registros.")
    print("Isso limpará os blocos vazios no Portal de Resultados de todos os pacientes.")
    print("Tem certeza que deseja APAGAR esses laudos? (Digite 'CONFIRMAR' para apagar)")
    
    confirmacao = input("> ").strip()

    if confirmacao == 'CONFIRMAR':
        # Deletando Grupo 1
        if total_robo > 0:
            apagados_robo, _ = laudos_robo.delete()
            print(f"🗑️  {apagados_robo} Laudos do robô apagados com sucesso.")
            
        # Deletando Grupo 2
        if total_vazios > 0:
            apagados_vazios, _ = laudos_vazios.delete()
            print(f"🗑️  {apagados_vazios} Laudos vazios/rascunhos apagados com sucesso.")
            
        print("\n✅ LIMPEZA CONCLUÍDA! O Portal de Resultados agora está organizado.")
    else:
        print("\n❌ Operação cancelada. Nenhum laudo foi apagado.")

if __name__ == "__main__":
    executar_limpeza_segura()