import sys
import os
import django

# Adiciona a raiz do projeto (backend) ao caminho do Python
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configura o Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Importa o modelo real de Paciente e o operador Q
from pacientes.models import Paciente #[cite: 8]
from django.db.models import Q

def buscar_paciente_sumido():
    print("=== 🔎 RASTREADOR AVANÇADO DE PACIENTES ===")
    termo = input("Digite o ID, Nome ou CPF do paciente sumido: ").strip()
    
    if not termo:
        print("Busca cancelada.")
        return

    print(f"\nBuscando '{termo}' no banco de dados...")
    
    # 1. Base da busca: procura se tem parte do NOME ou parte do CPF
    query = Q(nome_completo__icontains=termo) | Q(cpf__icontains=termo)
    
    # 2. Se você digitou apenas números, ele adiciona a busca exata pelo ID
    if termo.isdigit():
        query = query | Q(id=int(termo))
    
    # 3. Executa a varredura
    pacientes_encontrados = Paciente.objects.filter(query)
    
    if pacientes_encontrados.exists():
        print(f"\n✅ ENCONTREI {pacientes_encontrados.count()} PACIENTE(S):")
        print("-" * 50)
        for p in pacientes_encontrados:
            print(f"ID Interno: {p.id}")
            print(f"Nome:       {p.nome_completo}")
            print(f"CPF:        {p.cpf if p.cpf else 'Sem CPF'}")
            
            # Mostra a data de nascimento para ajudar a desempatar homônimos
            nasc = p.data_nascimento.strftime('%d/%m/%Y') if p.data_nascimento else 'Não informada'
            print(f"Nascimento: {nasc}")
            
            # Checa se o seu sistema usa "Soft Delete" (arquivar em vez de apagar)
            if hasattr(p, 'ativo'):
                status = "🟢 ATIVO" if p.ativo else "🔴 INATIVO/ARQUIVADO"
                print(f"Status:     {status}")
            
            print("-" * 50)
            
        print("\n💡 Dica: Se o paciente apareceu como INATIVO, ele não aparecerá na tela do frontend.")
    else:
        print(f"\n❌ NENHUM paciente encontrado com o termo '{termo}'.")
        print("Possíveis causas:")
        print("1. O paciente foi apagado definitivamente do banco de dados (Exclusão Real).")
        print("2. O nome foi cadastrado com um erro de digitação grave.")
        print("3. Ele pode ter sido cadastrado em outro ambiente/banco de dados (ex: homologação).")

if __name__ == "__main__":
    buscar_paciente_sumido()