import os
import sys
import django

# Pega o caminho absoluto da pasta raiz (backend) e adiciona ao Python
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Configuração do ambiente Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.apps import apps

def fazer_raio_x():
    print("=== 🩻 RAIO-X DOS MODELOS DO SISTEMA ===\n")
    
    # Lista de apps nativos do Django que vamos ignorar para limpar a visualização
    apps_ignorados = ['admin', 'auth', 'contenttypes', 'sessions', 'messages', 'staticfiles']
    
    for model in apps.get_models():
        app_label = model._meta.app_label
        model_name = model.__name__
        
        if app_label in apps_ignorados:
            continue

        print(f"📦 App: {app_label} | Modelo: {model_name}")
        
        # Inspeciona os campos para encontrar as ForeignKeys
        for field in model._meta.get_fields():
            if field.is_relation and hasattr(field, 'related_model') and field.related_model:
                related_name = field.related_model.__name__
                print(f"   🔗 Relacionamento: '{field.name}' -> aponta para o modelo '{related_name}'")
        
        print("-" * 50)

if __name__ == "__main__":
    fazer_raio_x()