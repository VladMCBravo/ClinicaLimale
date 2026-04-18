import os
import django

# Mantemos a configuração apontando para o seu settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.apps import apps

def localizar_modelo_paciente():
    print("=== 🔎 BUSCANDO O MODELO DE PACIENTE ===\n")
    
    encontrados = False
    for model in apps.get_models():
        # Procura qualquer modelo que tenha "paciente" no nome (ignorando maiúsculas/minúsculas)
        if 'paciente' in model.__name__.lower():
            app_name = model._meta.app_label
            model_name = model.__name__
            print(f"✅ Encontrado! -> APP_PACIENTE = '{app_name}' | MODEL_PACIENTE = '{model_name}'")
            encontrados = True
            
    if not encontrados:
        print("❌ Nenhum modelo com 'paciente' no nome foi encontrado.")
        print("Dê uma olhada no código do seu sistema. Qual o nome da classe que representa o paciente?")

if __name__ == "__main__":
    localizar_modelo_paciente()