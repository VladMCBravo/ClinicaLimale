import os
import sys
import django

# 1. Pega o caminho absoluto da pasta onde este script está (scripts/)
caminho_script = os.path.dirname(os.path.abspath(__file__))

# 2. Volta um nível para chegar na raiz do projeto (backend/)
caminho_projeto = os.path.dirname(caminho_script)

# 3. Adiciona a raiz do projeto aos caminhos de busca do Python
sys.path.append(caminho_projeto)

# 4. Inicia o Django apontando para as configurações
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.apps import apps

def investigar_dados_paciente(nome_alvo="Karine"):
    print(f"\n=== 🔎 INICIANDO VARREDURA DE DADOS PARA: {nome_alvo} ===\n")
    
    # 1. Encontrar o modelo de Paciente
    Paciente = None
    for model in apps.get_models():
        if 'paciente' in model.__name__.lower():
            Paciente = model
            break
            
    if not Paciente:
        print("❌ Modelo de paciente não encontrado.")
        return

    # 2. Localizar a paciente específica (Corrigido para nome_completo)
    pacientes = Paciente.objects.filter(nome_completo__icontains=nome_alvo)
    
    if not pacientes.exists():
        print(f"❌ Nenhuma paciente encontrada com o nome contendo '{nome_alvo}'.")
        return

    for p in pacientes:
        # Corrigido para buscar o atributo nome_completo
        nome = getattr(p, 'nome_completo', 'Sem Nome')
        print(f"👤 PACIENTE ENCONTRADA: {nome} (ID: {p.id})")
        print("-" * 50)

        # 3. Buscar dinamicamente todas as tabelas atreladas a ela
        for rel in p._meta.related_objects:
            accessor_name = rel.get_accessor_name()
            try:
                # Pega todos os registros dessa tabela relacionados à paciente
                related_queryset = getattr(p, accessor_name).all()
                total_registros = related_queryset.count()
                
                if total_registros > 0:
                    model_name = rel.related_model.__name__
                    print(f"\n📁 Tabela: {model_name} (Acesso: '{accessor_name}') - Total: {total_registros} registro(s)")
                    
                    # Mostra os detalhes dos registros para vermos as datas e IDs
                    for item in related_queryset.order_by('-id')[:10]:
                        data = getattr(item, 'data', getattr(item, 'criado_em', getattr(item, 'data_agendamento', getattr(item, 'created_at', 'Data não encontrada'))))
                        print(f"    -> ID: {item.id} | Data: {data} | Detalhes: {str(item)}")
                        
            except Exception as e:
                pass
        
        print("\n" + "=" * 50 + "\n")

if __name__ == "__main__":
    investigar_dados_paciente()