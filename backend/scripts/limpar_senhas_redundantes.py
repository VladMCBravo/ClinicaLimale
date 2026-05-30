import os
import sys
import django

# Configuração do ambiente
caminho_script = os.path.dirname(os.path.abspath(__file__))
caminho_projeto = os.path.dirname(caminho_script)
sys.path.append(caminho_projeto)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from exames.models import Exame

def limpar_tabela_exames_seguro():
    print("\n=== 🧹 LIMPANDO SENHAS REDUNDANTES (EX-) [V2] ===\n")
    
    # Busca todos os exames que ainda têm algum código preenchido 
    # e que não comecem com a nossa nova tag de lixo
    exames_com_senha = Exame.objects.exclude(codigo_acesso__exact='').exclude(codigo_acesso__startswith='INATIVO-')
    total = exames_com_senha.count()
    
    print(f"🔍 Foram encontrados {total} exames carregando credenciais 'EX-' antigas.")
    
    if total == 0:
        print("✅ A tabela de Exames já está limpa! Nenhuma ação necessária.")
        return
        
    print("Deseja apagar essas credenciais para economizar espaço no banco de dados? (S/N)")
    resposta = input("> ").strip().upper()
    
    if resposta == 'S':
        # Fazemos um loop rápido para garantir a exclusividade de cada linha (unique=True)
        corrigidos = 0
        for exame in exames_com_senha:
            # Coloca um prefixo inativo + o ID do exame para garantir que a string seja sempre única
            exame.codigo_acesso = f"INATIVO-{exame.id}"
            exame.senha_acesso = ""
            # update_fields deixa a operação muito mais leve para o banco
            exame.save(update_fields=['codigo_acesso', 'senha_acesso'])
            corrigidos += 1
            
        print(f"\n✅ Sucesso! {corrigidos} credenciais redundantes foram inativadas e limpas.")
        print("Agora apenas os códigos 'PCT-' dos Laudos são válidos na clínica.")
    else:
        print("\n❌ Operação cancelada.")

if __name__ == "__main__":
    limpar_tabela_exames_seguro()