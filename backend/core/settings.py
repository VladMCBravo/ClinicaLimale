# core/settings.py - VERSÃO FINAL PARA PRODUÇÃO

import os
import dj_database_url
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Configurações de Segurança ---
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
SECRET_KEY = os.environ.get('SECRET_KEY')

if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-fallback-key-for-development'
    else:
        from django.core.exceptions import ImproperlyConfigured
        raise ImproperlyConfigured("A variável de ambiente SECRET_KEY é obrigatória em produção.")

# --- Configurações de Acesso (Hosts e CORS) ---
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'clinicalimale.onrender.com']
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

CSRF_TRUSTED_ORIGINS = [
    'https://clinicalimale.onrender.com',
    'https://clinicalimale-dc0r.onrender.com',
]

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://clinicalimale-dc0r.onrender.com",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'False').lower() == 'true'
CORS_ALLOWED_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type',
    'dnt', 'origin', 'user-agent', 'x-csrftoken', 'x-requested-with',
]
CORS_ALLOWED_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']

# --- Configurações de Aplicações (Apps) ---
INSTALLED_APPS = [
    # Apps do Django Core
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',
      
    # Apps de Terceiros
    'rest_framework',
    'django_filters',  # <--- ADICIONE ESTA LINHA AQUI
    'storages', # <-- ADICIONADO: Necessário para o Supabase/S3 funcionar
    'rest_framework.authtoken',
    'rest_framework_api_key',
    'corsheaders',
    'dj_rest_auth',
    'allauth',

    # Meus Apps
    'core',
    'usuarios',
    'pacientes',
    'agendamentos',
    'prontuario',
    'faturamento',
    'dashboard',
    'chatbot',
    'channels',
    'integracao_dicom',
    'laudos',
    'exames',
    'crm',
]

# --- Configurações de Middleware ---
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # WhiteNoise aqui
    'corsheaders.middleware.CorsMiddleware',
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
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
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

# --- Arquivos Estáticos e Mídia ---
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Configurações do Supabase Storage (Lidas do Environment)
AWS_ACCESS_KEY_ID = os.environ.get('SUPABASE_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('SUPABASE_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('SUPABASE_STORAGE_BUCKET_NAME', 'exames')
AWS_S3_ENDPOINT_URL = os.environ.get('SUPABASE_S3_ENDPOINT_URL')
# --- A CORREÇÃO ESTÁ AQUI ---
# O Supabase S3 Wrapper geralmente valida assinaturas como 'us-east-1', 
# independentemente da região física do bucket.
AWS_S3_REGION_NAME = 'us-east-1' 

# Força o boto3 a usar 'endpoint/bucket' em vez de 'bucket.endpoint'
AWS_S3_ADDRESSING_STYLE = "path"

# Segurança dos Links
AWS_QUERYSTRING_AUTH = True
AWS_QUERYSTRING_EXPIRE = 3600
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_DEFAULT_ACL = None

# Configuração UNIFICADA (Django 4.2+)
STORAGES = {
    "default": {
        # Mídia (Uploads) -> Vai para o Supabase
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    "staticfiles": {
        # Estáticos (CSS/JS) -> Fica local/WhiteNoise
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

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

# --- Configurações de Cookies ---
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# --- Email ---
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_HOST_USER = 'bravotechcontato@gmail.com'
EMAIL_HOST_PASSWORD = 'hxnyhzwhdmrakirb'
EMAIL_PORT = 587
EMAIL_USE_TLS = True

# --- Django Channels ---
ASGI_APPLICATION = 'core.asgi.application'
REDIS_URL = os.environ.get('REDIS_URL')

if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {"hosts": [REDIS_URL]},
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {"hosts": [('127.0.0.1', 6379)]},
        },
    }
    
# --- Configurações de Upload ---
# Aumentando para 100MB para garantir que laudos com muitas imagens passem
# 100 * 1024 * 1024 = 104857600 bytes
DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600
FILE_UPLOAD_MAX_MEMORY_SIZE = 104857600

# --- chatbot/settings.py ---
# Adicionar ao final do arquivo core/settings.py

EVOLUTION_API_URL = os.environ.get('EVOLUTION_API_URL')
EVOLUTION_API_KEY = os.environ.get('EVOLUTION_API_KEY')
EVOLUTION_INSTANCE = os.environ.get('EVOLUTION_INSTANCE', 'crm_oficial')
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')

# Chave para criptografia do certificado digital (Mantenha em segredo!)
# Você pode gerar uma nova com: from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())
FERNET_KEY = os.environ.get('FERNET_KEY', 'sua-chave-fernet-aqui')

# --- Celery Configuration ---
# Usa a mesma URL do Redis que os Channels já estão usando
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
# Opcional: define um limite de tempo para a tarefa não travar a fila eternamente (ex: 5 minutos)
CELERY_TASK_TIME_LIMIT = 300