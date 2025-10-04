# backend/core/views.py
import os
from django.http import JsonResponse
from django.contrib.auth.decorators import user_passes_test
from django.urls import get_resolver

# Esta função verifica se o utilizador é um superuser (admin)
def is_superuser(user):
    return user.is_superuser

@user_passes_test(is_superuser)
def debug_env_view(request):
    """
    Uma view segura para verificar o valor de uma variável de ambiente.
    """
    api_key = os.environ.get('SENDGRID_API_KEY')
    
    debug_info = {
        'sendgrid_api_key_loaded': api_key is not None,
        'first_5_chars_of_key': api_key[:5] if api_key else None
    }
    
    return JsonResponse(debug_info)

def list_urls_view(request):
    """
    Uma view de depuração que lista todas as URLs registradas no projeto.
    """
    resolver = get_resolver()
    url_patterns = []

    def format_pattern(p):
        # Esta função ajuda a formatar as URLs para fácil leitura
        if hasattr(p, 'url_patterns'):
            # Se for um include, processa as sub-rotas
            return [format_pattern(sub_p) for sub_p in p.url_patterns]
        else:
            # Retorna a rota como string
            return str(p.pattern)

    for pattern in resolver.url_patterns:
        url_patterns.append(format_pattern(pattern))
    
    # Usamos JsonResponse para formatar a saída de forma limpa
    return JsonResponse({
        "message": "URLs registradas no projeto",
        "urls": url_patterns
    }, json_dumps_params={'indent': 2})