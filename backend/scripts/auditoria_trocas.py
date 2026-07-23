import os
import sys
import django
import unicodedata

# 1. Configuração do ambiente Django
caminho_script = os.path.dirname(os.path.abspath(__file__))
caminho_projeto = os.path.dirname(caminho_script)
sys.path.append(caminho_projeto)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from exames.models import Exame

def remover_acentos(txt):
    """Remove acentos e deixa tudo em maiúsculo para comparação justa"""
    if not txt: 
        return ""
    txt_sem_acento = ''.join(c for c in unicodedata.normalize('NFD', str(txt)) if unicodedata.category(c) != 'Mn')
    return txt_sem_acento.upper().strip()

def auditar_e_corrigir_exames():
    print("\n" + "="*65)
    print(" 🕵️‍♂️ INICIANDO AUDITORIA DE EXAMES TROCADOS (SAMSUNG) ")
    print("="*65 + "\n")

    # Busca todos os exames que já foram vinculados a algum paciente pelo robô
    exames_vinculados = Exame.objects.select_related('paciente').exclude(paciente__isnull=True)
    exames_suspeitos = []

    for exame in exames_vinculados:
        pasta_limpa = remover_acentos(exame.nome_paciente_pasta)
        nome_banco_limpo = remover_acentos(exame.paciente.nome_completo)
        
        # Pega o primeiro nome da pessoa cadastrada no banco
        partes_nome = nome_banco_limpo.split()
        primeiro_nome = partes_nome[0] if len(partes_nome) > 0 else ""
        
        # A MÁGICA: Se o 1º nome do paciente NÃO EXISTIR em NENHUM lugar do nome da pasta
        # (Ex: "TAINA" não existe na pasta "08072026-1_DE ARAUJO_TATIANE APARECIDA")
        if primeiro_nome and primeiro_nome not in pasta_limpa:
            # Ignora os exames criados pelo sistema para abrigar laudos antigos (Retificações)
            if "(Ajustado)" not in exame.nome_paciente_pasta:
                exames_suspeitos.append(exame)

    if not exames_suspeitos:
        print("✅ Tudo limpo! Nenhum exame vinculado à pessoa errada encontrado.")
        return

    print(f"⚠️  ALERTA: Encontramos {len(exames_suspeitos)} exame(s) possivelmente trocado(s)!\n")
    
    for ex in exames_suspeitos:
        print(f"ID Exame: {ex.id}")
        print(f"📁 Nome da Pasta (Samsung) : {ex.nome_paciente_pasta}")
        print(f"👤 Vinculado ERRADO a     : {ex.paciente.nome_completo}")
        print("-" * 65)

    print("\nDeseja DESVINCULAR esses exames agora?")
    print("Eles voltarão para o status 'PENDENTE' e ficarão disponíveis para vínculo manual na Recepção.")
    resp = input("Digite 'SIM' para corrigir ou 'N' para cancelar: ").strip().upper()

    if resp == 'SIM':
        corrigidos = 0
        for ex in exames_suspeitos:
            ex.paciente = None
            ex.status = 'PENDENTE'
            ex.save()
            corrigidos += 1
            
        print(f"\n🎉 CORREÇÃO CONCLUÍDA! {corrigidos} exames foram desvinculados com sucesso.")
    else:
        print("\n❌ Operação cancelada. Nenhuma alteração foi feita no banco de dados.")

if __name__ == '__main__':
    auditar_e_corrigir_exames()