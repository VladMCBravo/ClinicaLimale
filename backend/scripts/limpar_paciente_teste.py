import os
import sys
import django

# Configuração do ambiente
caminho_script = os.path.dirname(os.path.abspath(__file__))
caminho_projeto = os.path.dirname(caminho_script)
sys.path.append(caminho_projeto)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.apps import apps

def limpar_dados_paciente(nome_alvo="Paciente Teste"):
    print(f"\n=== 🧹 LIMPANDO DADOS RELACIONADOS DO PACIENTE: {nome_alvo} ===\n")
    
    # 1. Encontrar o modelo de Paciente dinamicamente
    Paciente = None
    for model in apps.get_models():
        if 'paciente' in model.__name__.lower():
            Paciente = model
            break
            
    if not Paciente:
        print("❌ Modelo de paciente não encontrado no sistema.")
        return

    # 2. Buscar o paciente específico (busca exata)
    pacientes = Paciente.objects.filter(nome_completo__iexact=nome_alvo)
    
    if not pacientes.exists():
        print(f"❌ Nenhum paciente encontrado com o nome exato '{nome_alvo}'.")
        return

    paciente = pacientes.first()
    print(f"👤 PACIENTE ENCONTRADO: {paciente.nome_completo} (ID: {paciente.id})")
    print("Buscando dados atrelados (Financeiro, Prontuário, Exames, etc)...\n")

    resumo_delecao = []

    # 3. Vasculhar todas as relações (ForeignKeys, OneToOne) apontando para este paciente
    for rel in paciente._meta.related_objects:
        accessor_name = rel.get_accessor_name()
        model_name = rel.related_model.__name__
        
        try:
            # Tenta acessar como uma lista (Ex: agendamentos, laudos, exames)
            related_queryset = getattr(paciente, accessor_name).all()
            total = related_queryset.count()
            
            if total > 0:
                resumo_delecao.append((accessor_name, model_name, total, 'queryset'))
                print(f"   - Encontrados {total} registro(s) em {model_name}")
                
        except AttributeError:
            # Se der erro, é porque é uma relação Um-Para-Um (Ex: Anamnese principal)
            try:
                obj = getattr(paciente, accessor_name)
                if obj:
                    resumo_delecao.append((accessor_name, model_name, 1, 'object'))
                    print(f"   - Encontrado 1 registro em {model_name}")
            except Exception:
                pass

    # 4. Confirmação
    if not resumo_delecao:
        print("\n✅ Este paciente já está limpo. Não há histórico atrelado a ele.")
        return

    print("\n⚠️  ATENÇÃO: Você está prestes a excluir todos os registros listados acima.")
    print("O CADASTRO principal do paciente será MANTIDO, mas todo o resto desaparecerá.")
    confirmacao = input("Digite 'CONFIRMAR' para apagar: ").strip()

    # 5. Executar a exclusão
    if confirmacao == 'CONFIRMAR':
        print("\nIniciando exclusão...")
        
        for accessor_name, model_name, total, tipo in resumo_delecao:
            if tipo == 'queryset':
                getattr(paciente, accessor_name).all().delete()
                print(f"🗑️  {total} registro(s) apagados da tabela {model_name}.")
            elif tipo == 'object':
                obj = getattr(paciente, accessor_name)
                if obj:
                    obj.delete()
                    print(f"🗑️  1 registro apagado da tabela {model_name}.")
        
        print(f"\n✅ Limpeza do paciente '{paciente.nome_completo}' concluída com sucesso!")
        print("Você já pode fazer novos testes com este cadastro limpo.")
    else:
        print("\n❌ Operação cancelada. Nenhum registro foi apagado.")

if __name__ == "__main__":
    limpar_dados_paciente()