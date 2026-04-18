import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.apps import apps
from django.db import transaction
from django.db.models import Count

# ---- CONFIGURAÇÕES EXATAS DO SEU SISTEMA ----
APP_PACIENTE = 'pacientes'
MODEL_PACIENTE = 'Paciente'
# ---------------------------------------------

def buscar_duplicados():
    Paciente = apps.get_model(APP_PACIENTE, MODEL_PACIENTE)
    # Traz pacientes com o mesmo nome exato, usando 'nome_completo'
    return Paciente.objects.values('nome_completo').annotate(total=Count('id')).filter(total__gt=1)

def realizar_mesclagem():
    Paciente = apps.get_model(APP_PACIENTE, MODEL_PACIENTE)
    duplicados = buscar_duplicados()
    
    if not duplicados:
        print("✅ Nenhum paciente com nome duplicado encontrado.")
        return

    print(f"⚠️ Encontrados {len(duplicados)} nomes com cadastros múltiplos.\n")

    for item in duplicados:
        nome_paciente = item['nome_completo'] # Usando o campo correto aqui também
        cadastros = Paciente.objects.filter(nome_completo=nome_paciente).order_by('id')
        
        print("-" * 60)
        print(f"👤 Paciente: {nome_paciente} (Encontrados {item['total']} cadastros)")
        
        for p in cadastros:
            # Pegando as informações reais confirmadas pelo erro
            data_nasc = getattr(p, 'data_nascimento', 'N/A')
            doc = getattr(p, 'cpf', 'N/A')
            print(f"   [ ID: {p.id} ] - Nasc: {data_nasc} - CPF: {doc}")
        
        acao = input("\nDeseja analisar e mesclar este paciente agora? (s/n/sair): ").strip().lower()
        
        if acao == 'sair':
            print("Encerrando o processo de mesclagem.")
            break
        elif acao != 's':
            continue

        try:
            id_mestre = int(input("👉 Digite o ID do cadastro MESTRE (o que será MANTIDO): ").strip())
            mestre = cadastros.get(id=id_mestre)
            duplicatas = cadastros.exclude(id=id_mestre)
            
            print(f"\nO cadastro ID {id_mestre} receberá todos os laudos, exames, finanças, etc. Os outros serão removidos.")
            confirmacao = input("TEM CERTEZA? (s/n): ").strip().lower()
            
            if confirmacao == 's':
                with transaction.atomic():
                    for duplicata in duplicatas:
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
                        
                        duplicata.delete()
                        print(f"   🗑️ Cadastro duplicado ID {duplicata.id} removido limpo.")
                    
                    print(f"✅ Mesclagem do paciente '{nome_paciente}' concluída com sucesso e segurança!")
        
        except ValueError:
            print("❌ ID inválido. Ignorando este paciente por segurança.")
        except Paciente.DoesNotExist:
            print("❌ O ID digitado não pertence a este grupo de cadastros.")
        except Exception as e:
            print(f"❌ Erro crítico. A transação foi desfeita: {e}")

if __name__ == "__main__":
    print("INICIANDO ROTINA DE MESCLAGEM SEGURA...")
    realizar_mesclagem()