import os
import sys
import django
import unicodedata
from difflib import SequenceMatcher

# Garante que o Python enxergue a pasta 'backend' (raiz do projeto)
# independentemente da pasta de onde o script for executado.
diretorio_atual = os.path.dirname(os.path.abspath(__file__))
diretorio_raiz = os.path.dirname(diretorio_atual)
sys.path.append(diretorio_raiz)

# Inicialização do Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.apps import apps
from django.db import transaction

# ---- CONFIGURAÇÕES DA CLÍNICA LIMALÉ ----
APP_PACIENTE = 'pacientes'
MODEL_PACIENTE = 'Paciente'
# ---------------------------------------------

def padronizar_nome(nome):
    """Remove acentos, espaços extras e deixa em minúsculo para comparação."""
    if not nome: return ""
    nome = unicodedata.normalize('NFD', nome).encode('ascii', 'ignore').decode("utf-8")
    return " ".join(nome.lower().split())

def sao_parecidos(nome1, nome2, limite=0.88):
    """Calcula a similaridade entre duas strings."""
    if nome1 == nome2:
        return True
    return SequenceMatcher(None, nome1, nome2).ratio() >= limite

def buscar_duplicados_aproximados():
    """Busca pacientes com nomes parecidos e agrupa-os."""
    Paciente = apps.get_model(APP_PACIENTE, MODEL_PACIENTE)
    todos_pacientes = list(Paciente.objects.all().order_by('id'))
    
    grupos = []
    processados = set()

    print("\n🔍 Analisando banco de dados da Clínica Limalé para encontrar duplicatas...")
    print("⏳ Aguarde um instante...\n")

    for i, p1 in enumerate(todos_pacientes):
        if p1.id in processados:
            continue
        
        nome_p1 = padronizar_nome(p1.nome_completo)
        grupo_atual = [p1]
        processados.add(p1.id)

        for p2 in todos_pacientes[i+1:]:
            if p2.id in processados:
                continue
            
            nome_p2 = padronizar_nome(p2.nome_completo)
            
            if sao_parecidos(nome_p1, nome_p2): 
                grupo_atual.append(p2)
                processados.add(p2.id)
        
        if len(grupo_atual) > 1:
            grupos.append(grupo_atual)

    return grupos

def transferir_vinculos(mestre, duplicata):
    """Transfere todos os relacionamentos (FK e M2M) de um cadastro para outro."""
    for related_object in mestre._meta.related_objects:
        rel_model = related_object.related_model
        rel_field_name = related_object.field.name
        
        try:
            if not related_object.field.many_to_many:
                kwargs_busca = {rel_field_name: duplicata}
                registros = rel_model.objects.filter(**kwargs_busca)
                qtd = registros.count()
                if qtd > 0:
                    registros.update(**{rel_field_name: mestre})
                    print(f"   ✔️ {qtd} registro(s) de '{rel_model.__name__}' transferido(s).")
            else:
                kwargs_busca = {rel_field_name: duplicata}
                registros = rel_model.objects.filter(**kwargs_busca)
                qtd = registros.count()
                if qtd > 0:
                    for reg in registros:
                        m2m_manager = getattr(reg, rel_field_name)
                        m2m_manager.remove(duplicata)
                        m2m_manager.add(mestre)
                    print(f"   ✔️ {qtd} vínculo(s) múltiplo(s) de '{rel_model.__name__}' transferido(s).")
                    
        except Exception as e:
            print(f"   ⚠️ Aviso ao mover dependência {rel_model.__name__}: {e}")

def realizar_gerenciamento():
    Paciente = apps.get_model(APP_PACIENTE, MODEL_PACIENTE)
    grupos_duplicados = buscar_duplicados_aproximados()
    
    if not grupos_duplicados:
        print("✅ Excelente! Nenhum paciente com nome duplicado foi encontrado.")
        return

    print(f"⚠️ Atenção: Encontrados {len(grupos_duplicados)} grupos de pacientes com nomes semelhantes.\n")

    for grupo in grupos_duplicados:
        print("=" * 70)
        print(f"👥 GRUPO DE DUPLICATAS ({len(grupo)} cadastros encontrados):")
        
        ids_grupo = []
        for p in grupo:
            ids_grupo.append(p.id)
            data_nasc = getattr(p, 'data_nascimento', 'N/A')
            doc = getattr(p, 'cpf', 'N/A')
            print(f"   [ ID: {p.id} ] - Nome: '{p.nome_completo}' | Nasc: {data_nasc} | CPF: {doc}")
        
        while True:
            print("\nO que deseja fazer com este grupo?")
            print("  [M] MESCLAR (Escolher um ID Mestre, herdar os dados e apagar o resto)")
            print("  [E] EXCLUIR um ID (Apagar um ID específico sem herdar nada)")
            print("  [P] PULAR (Não fazer nada com este grupo agora)")
            print("  [S] SAIR (Encerrar o script)")
            
            acao = input("\n👉 Digite sua escolha (M/E/P/S): ").strip().upper()
            
            if acao == 'S':
                print("\nEncerrando o processo de limpeza de pacientes.")
                return
            
            elif acao == 'P':
                print("Pulando para o próximo grupo...\n")
                break # Sai do loop deste grupo e vai pro próximo
                
            elif acao == 'E':
                try:
                    id_del = int(input("🗑️ Digite o ID do cadastro que será EXCLUÍDO (sem herança): ").strip())
                    if id_del not in ids_grupo:
                        print("❌ O ID digitado não faz parte do grupo acima.")
                        continue
                        
                    confirmacao = input(f"TEM CERTEZA que deseja apagar DEFINITIVAMENTE o ID {id_del}? (s/n): ").strip().lower()
                    if confirmacao == 's':
                        paciente_del = Paciente.objects.get(id=id_del)
                        nome_deletado = paciente_del.nome_completo
                        paciente_del.delete()
                        print(f"✅ Cadastro ID {id_del} ('{nome_deletado}') excluído com sucesso!")
                        break # Atualiza grupo e vai pro próximo
                except ValueError:
                    print("❌ ID inválido. Tente novamente.")
                    
            elif acao == 'M':
                try:
                    id_mestre = int(input("👑 Digite o ID do cadastro MESTRE (o que será MANTIDO): ").strip())
                    
                    if id_mestre not in ids_grupo:
                        print("❌ O ID digitado não faz parte do grupo. Tente novamente.")
                        continue

                    mestre = Paciente.objects.get(id=id_mestre)
                    duplicatas = [p for p in grupo if p.id != id_mestre]
                    
                    print(f"\nO cadastro ID {id_mestre} ({mestre.nome_completo}) VAI RECEBER laudos e exames. Os demais serão apagados.")
                    confirmacao = input("TEM CERTEZA DA MESCLAGEM? (s/n): ").strip().lower()
                    
                    if confirmacao == 's':
                        with transaction.atomic(): # Garante que nada será salvo pela metade em caso de erro
                            for duplicata_instancia in duplicatas:
                                duplicata = Paciente.objects.get(id=duplicata_instancia.id)
                                
                                transferir_vinculos(mestre, duplicata)
                                
                                nome_deletado = duplicata.nome_completo
                                duplicata.delete()
                                print(f"   🗑️ Cadastro duplicado ID {duplicata.id} ('{nome_deletado}') removido.")
                            
                            print(f"✅ Mesclagem concluída com sucesso e segurança para a Clínica Limalé!")
                            break # Vai para o próximo grupo
                except ValueError:
                    print("❌ ID inválido. Tente novamente.")
                except Exception as e:
                    print(f"❌ Erro crítico. A transação foi desfeita: {e}")
            else:
                print("❌ Opção inválida. Escolha M, E, P ou S.")

if __name__ == "__main__":
    realizar_gerenciamento()