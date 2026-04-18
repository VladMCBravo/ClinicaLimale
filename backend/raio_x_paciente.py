import os
import django

# Configuração do ambiente Django (Ajuste se o settings for diferente)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.apps import apps

def mapear_relacionamentos_paciente(app_do_paciente='pacientes', modelo_do_paciente='Paciente'):
    print(f"=== 🔍 MAPEAMENTO DE DEPENDÊNCIAS DO MODELO {modelo_do_paciente.upper()} ===\n")
    
    try:
        ModeloPaciente = apps.get_model(app_do_paciente, modelo_do_paciente)
    except LookupError:
        print(f"❌ Erro: Não foi possível encontrar o modelo {modelo_do_paciente} no app {app_do_paciente}.")
        print("Por favor, ajuste as variáveis na chamada da função.")
        return

    relacionamentos = []

    # Inspeciona todos os modelos do projeto em busca de ForeignKeys para o Paciente
    for model in apps.get_models():
        for field in model._meta.get_fields():
            if field.is_relation and hasattr(field, 'related_model') and field.related_model == ModeloPaciente:
                relacionamentos.append({
                    'app': model._meta.app_label,
                    'modelo': model.__name__,
                    'campo': field.name
                })
    
    if relacionamentos:
        print(f"Modelos que possuem informações atreladas ao {modelo_do_paciente}:")
        for rel in relacionamentos:
            print(f" 🔗 {rel['app']}.{rel['modelo']} (Campo: '{rel['campo']}')")
    else:
        print("Nenhum relacionamento encontrado.")
        
    return relacionamentos

if __name__ == "__main__":
    mapear_relacionamentos_paciente(app_do_paciente='pacientes', modelo_do_paciente='Paciente')