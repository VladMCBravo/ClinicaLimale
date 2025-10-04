# core/settings.py - VERSÃO REVISADA E ORGANIZADA

import os
import dj_database_url
from pathlib import Path
from dotenv import load_dotenv
import dj_redis_url # <-- ADICIONE ESTA IMPORTAÇÃO NO TOPO

load_dotenv()
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Configurações de Segurança ---
# Lendo a partir de variáveis de ambiente para maior segurança em produção.
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-fallback-key-for-development')
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# --- Configurações de Acesso (Hosts e CORS) ---
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'clinicalimale.onrender.com']
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
# --- ADICIONE ESTA NOVA CONFIGURAÇÃO ABAIXO ---
CSRF_TRUSTED_ORIGINS = [
    'https://clinicalimale.onrender.com',
]
# MELHORIA: Usar regex para aceitar todas as URLs de preview da Vercel automaticamente.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https?://localhost:\d+",  # Permite localhost em qualquer porta (3000, 5173, etc.)
    r"^https?://.*\.vercel\.app$", # Permite seu domínio principal e qualquer preview (ex: clinica-limale-xxxxx.vercel.app)
]
CORS_ALLOW_CREDENTIALS = True

# --- Configurações de Aplicações (Apps) ---
INSTALLED_APPS = [
    # Apps do Django Core
    'daphne', # <-- ADICIONE ESTA LINHA NO TOPO
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic', # Whitenoise para arquivos estáticos
    'django.contrib.staticfiles',
      
    # Apps de Terceiros
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_api_key',
    'corsheaders', # <-- CORREÇÃO: Removida a duplicata
    'dj_rest_auth',
    'allauth',

    # Meus Apps
    'usuarios',
    'pacientes',
    'agendamentos',
    'prontuario',
    'faturamento',
    'dashboard',
    'chatbot',
    'channels',
    'integracao_dicom',
]

# --- Configurações de Middleware ---
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware', # Posição correta, alta na lista
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# --- Configurações Principais do Django ---
ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Database
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600
    )
}
AUTH_USER_MODEL = 'usuarios.CustomUser'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Internacionalização ---
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# --- Arquivos Estáticos ---
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# --- Configurações do Django Rest Framework ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ]
}

# --- Configurações de Cookies para Cross-Domain ---
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# --- Configurações de Serviços Externos (Email e Pagamento) ---
# Email (SendGrid)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_HOST_USER = 'apikey'
EMAIL_HOST_PASSWORD = os.environ.get('SENDGRID_API_KEY')
EMAIL_PORT = 587
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'nao-responda@suaclinica.com')

# --- Configurações do Django Channels ---
ASGI_APPLICATION = 'core.asgi.application'

REDIS_URL = os.environ.get('REDIS_URL')

if REDIS_URL:
    # Configuração para produção (Render)
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [REDIS_URL],
            },
        },
    }
else:
    # Configuração para desenvolvimento (sua máquina local)
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [('127.0.0.1', 6379)],
            },
        },
    }