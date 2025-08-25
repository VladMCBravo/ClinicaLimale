# backend/core/views.py
import os
from django.http import JsonResponse
from django.contrib.auth.decorators import user_passes_test

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