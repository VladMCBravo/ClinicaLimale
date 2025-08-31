"""
Django settings for core project.
"""
import os
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv
load_dotenv()
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# --- MELHORIA DE SEGURANÇA: Carregar chaves a partir de variáveis de ambiente ---
# A sua chave secreta agora será lida do ambiente, tornando o seu código mais seguro.
# No seu ambiente local, você pode criar um ficheiro .env ou definir esta variável.
# No Render, você já sabe como adicionar variáveis de ambiente.
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-fallback-key-for-development')

# --- MELHORIA DE DEBUG - Ativar/desativar o modo de depuração automaticamente ---
# O valor 'False' é mais seguro para produção. 'True' só será usado se você definir
# a variável de ambiente DEBUG=True, o que é útil para depuração remota.
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# --- MELHORIA EM ALLOWED_HOSTS ---
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'clinicalimale.onrender.com',  # <--- ADICIONE ESTA LINHA
]
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# Application definition
INSTALLED_APPS = [
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'pacientes',
    'agendamentos',
    'prontuario',
    'usuarios',
    'faturamento',
    'dashboard',
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_api_key',
    'dj_rest_auth',
    'allauth',
    'whitenoise.runserver_nostatic', # Adicionado para melhor servir ficheiros estáticos
    'chatbot',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

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

WSGI_APPLICATION = 'core.wsgi.application'

# Database
DATABASES = {
    'default': dj_database_url.config(
        # --- MELHORIA DE SEGURANÇA: Removida a senha do código ---
        # A sua base de dados de produção (Supabase/Render) deve ser definida apenas
        # pela variável de ambiente DATABASE_URL.
        default='sqlite:///db.sqlite3', # Usar SQLite como padrão local é mais simples
        conn_max_age=600
    )
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True # Mantido como True, que é a melhor prática

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
# O Whitenoise lida com a pasta STATIC_ROOT em produção
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Configurações do CORS
CORS_ALLOWED_ORIGINS = [
    "https://clinica-limale.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# --- MELHORIA DE SEGURANÇA PARA COOKIES EM PRODUÇÃO ---
# Necessário para que a autenticação funcione com frontend e backend em domínios diferentes,
# especialmente em navegadores com alta privacidade como o Safari.

# Permite que o cookie seja enviado em requisições de outros domínios (cross-site)
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'

# Exige que os cookies acima só sejam enviados através de uma conexão segura (HTTPS)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Permite que o frontend envie credenciais (como cookies de sessão) para o backend
CORS_ALLOW_CREDENTIALS = True

# Se o seu frontend e backend estiverem em subdomínios do mesmo site no futuro,
# você pode usar esta configuração, que é mais segura.
# CORS_TRUSTED_ORIGINS = ['https://clinica-limale.vercel.app']

# Diz ao Django para usar nosso modelo de usuário personalizado
AUTH_USER_MODEL = 'usuarios.CustomUser'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        # Em produção final, você pode querer remover o BrowsableAPIRenderer
        'rest_framework.renderers.BrowsableAPIRenderer',
    ]
}

# CONFIGURAÇÕES DE EMAIL (SENDGRID)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_HOST_USER = 'apikey'
EMAIL_HOST_PASSWORD = os.environ.get('SENDGRID_API_KEY')
EMAIL_PORT = 587
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'seu-email-padrao@exemplo.com')