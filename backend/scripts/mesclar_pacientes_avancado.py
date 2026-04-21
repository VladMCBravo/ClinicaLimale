import os
import django
import unicodedata
from difflib import SequenceMatcher

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.apps import apps
from django.db import transaction

# ---- CONFIGURAÇÕES DO SEU SISTEMA ----
APP_PACIENTE = 'pacientes'
MODEL_PACIENTE = 'Paciente'
# ---------------------------------------------

def padronizar_nome(nome):
    """Remove acentos, espaços extras e deixa em minúsculo."""
    if not nome: return ""
    nome = unicodedata.normalize('NFD', nome).encode('ascii', 'ignore').decode("utf-8")
    return " ".join(nome.lower().split())

def sao_parecidos(nome1, nome2, limite=0.88):
    """Calcula a similaridade entre duas strings."""
    if nome1 == nome2:
        return True
    return SequenceMatcher(None, nome1, nome2).ratio() >= limite

def buscar_duplicados_aproximados():
    Paciente = apps.get_model(APP_PACIENTE, MODEL_PACIENTE)
    # Traz todos os pacientes ordenados para fazer a comparação
    todos_pacientes = list(Paciente.objects.all().order_by('id'))
    
    grupos = []
    processados = set()

    print("🔍 Analisando banco de dados para encontrar nomes semelhantes...")
    print("⏳ Isso pode levar alguns segundos dependendo do tamanho do seu cadastro...\n")

    for i, p1 in enumerate(todos_pacientes):
        if p1.id in processados:
            continue
        
        nome_p1 = padronizar_nome(p1.nome_completo)
        grupo_atual = [p1]
        processados.add(p1.id)

        # Compara o paciente atual com o restante da lista
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

def realizar_mesclagem():
    Paciente = apps.get_model(APP_PACIENTE, MODEL_PACIENTE)
    grupos_duplicados = buscar_duplicados_aproximados()
    
    if not grupos_duplicados:
        print("✅ Nenhum paciente com nome parecido foi encontrado.")
        return

    print(f"⚠️ Encontrados {len(grupos_duplicados)} grupos de pacientes com nomes muito semelhantes.\n")

    for grupo in grupos_duplicados:
        print("-" * 60)
        print(f"👥 Grupo de Possíveis Duplicatas ({len(grupo)} cadastros encontrados):")
        
        for p in grupo:
            data_nasc = getattr(p, 'data_nascimento', 'N/A')
            doc = getattr(p, 'cpf', 'N/A')
            # Mostramos o nome ORIGINAL do banco para você ver a diferença visualmente
            print(f"   [ ID: {p.id} ] - Nome: '{p.nome_completo}' | Nasc: {data_nasc} | CPF: {doc}")
        
        acao = input("\nDeseja analisar e mesclar este grupo agora? (s/n/sair): ").strip().lower()
        
        if acao == 'sair':
            print("Encerrando o processo de mesclagem.")
            break
        elif acao != 's':
            continue

        try:
            id_mestre = int(input("👉 Digite o ID do cadastro MESTRE (o que será MANTIDO): ").strip())
            
            ids_grupo = [p.id for p in grupo]
            if id_mestre not in ids_grupo:
                print("❌ O ID digitado não faz parte das opções acima. Pulando este grupo por segurança.")
                continue

            mestre = Paciente.objects.get(id=id_mestre)
            duplicatas = [p for p in grupo if p.id != id_mestre]
            
            print(f"\nO cadastro ID {id_mestre} ({mestre.nome_completo}) receberá os dados.")
            confirmacao = input("TEM CERTEZA? (s/n): ").strip().lower()
            
            if confirmacao == 's':
                with transaction.atomic():
                    for duplicata_instancia in duplicatas:
                        # Busca o objeto fresco do banco
                        duplicata = Paciente.objects.get(id=duplicata_instancia.id)
                        
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
                        
                        nome_deletado = duplicata.nome_completo
                        duplicata.delete()
                        print(f"   🗑️ Cadastro duplicado ID {duplicata.id} ('{nome_deletado}') removido.")
                    
                    print(f"✅ Mesclagem concluída com sucesso e segurança!")
        
        except ValueError:
            print("❌ ID inválido. Ignorando este grupo por segurança.")
        except Exception as e:
            print(f"❌ Erro crítico. A transação foi desfeita para manter a estabilidade: {e}")

if __name__ == "__main__":
    realizar_mesclagem()