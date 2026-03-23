"""
Django settings for config project.
"""

import os
from pathlib import Path
from datetime import timedelta  # <--- ДОБАВЛЕНО ДЛЯ JWT
from dotenv import load_dotenv

# Загружаем переменные из файла .env
load_dotenv()

# ТОКЕН ТЕЛЕГРАМ БОТА
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-w2d3b5sy=20=+ox3q!ccvc-zc94seeln^@j4hlv-z(knt_rkcd'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*'] # Для разработки можно оставить '*', на проде укажешь свой домен


# Application definition
INSTALLED_APPS = [
    'unfold',  
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # --- Сторонние библиотеки ---
    'rest_framework',       # API
    'rest_framework_simplejwt',
    'django_filters',       # <--- ДОБАВЛЕНО ДЛЯ JWT
    'corsheaders',          # Чтобы React мог общаться с Django

    # --- Наши приложения ---
    'logistics',            # Логика Kayhon Cargo
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # <--- ВАЖНО: Должно быть первым!
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # <--- ДОБАВЛЕНО ДЛЯ РАЗДАЧИ СТАТИКИ
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

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

WSGI_APPLICATION = 'config.wsgi.application'


# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# --- НАСТРОЙКИ DJANGO REST FRAMEWORK (ДОБАВЛЕНО) ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    # --- НОВЫЕ НАСТРОЙКИ ---
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20, # Количество записей на одной странице
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
}

# --- НАСТРОЙКИ JWT ТОКЕНОВ (ДОБАВЛЕНО) ---
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),   # Время жизни основного токена
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),  # Время жизни токена обновления
    'AUTH_HEADER_TYPES': ('Bearer',),             # Тип заголовка Authorization: Bearer <token>
}


# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Dushanbe'
USE_I18N = True
USE_TZ = True


# =========================================================
# --- НАСТРОЙКИ СТАТИЧЕСКИХ ФАЙЛОВ (CSS, JS, Изображения)
# =========================================================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles' 

# ДОБАВЛЕНО: Явное указание хранилища для корректной работы WhiteNoise
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# =========================================================
# --- НАСТРОЙКИ МЕДИА-ФАЙЛОВ (ДЛЯ ЗАГРУЗКИ ФОТО И АВАТАРОК)
# =========================================================
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# =========================================================
# --- WEB PUSH (VAPID) ---
# =========================================================
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_ADMIN_EMAIL = os.environ.get('VAPID_ADMIN_EMAIL', 'admin@kayhoncargo.com')


# --- Настройки CORS (Связь с React) ---
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",  
    "http://127.0.0.1:5174",  
    "https://kayhon-cargo.web.app",
]
CSRF_TRUSTED_ORIGINS = [
    "https://kayhon-cargo.web.app",
    "https://kayhon-backend-538751744849.europe-west3.run.app",
]

# --- Настройки темы UNFOLD (Современный Dashboard) ---
UNFOLD = {
    "SITE_TITLE": "Kayhon Cargo",
    "SITE_HEADER": "Kayhon Logistics",
    "SITE_URL": "/",
    "SITE_ICON": None,  

    # Цвета (Primary - синий, как на вашем фронтенде)
    "COLORS": {
        "primary": {
            "50": "239 246 255",
            "100": "219 234 254",
            "200": "191 219 254",
            "300": "147 197 253",
            "400": "96 165 250",
            "500": "59 130 246",
            "600": "37 99 235",
            "700": "29 78 216",
            "800": "30 64 175",
            "900": "30 58 138",
        },
    },

    # Настройка бокового меню (Sidebar)
    "SIDEBAR": {
        "show_search": True,  
        "show_all_applications": False, 
        "navigation": [
            {
                "title": "Логистика",
                "separator": True,  
                "items": [
                    {
                        "title": "📦 Посылки (Грузы)",
                        "icon": "box",
                        "link": "/admin/logistics/package/",
                    },
                    {
                        "title": "👥 Клиенты",
                        "icon": "group",
                        "link": "/admin/logistics/clientprofile/",
                    },
                ],
            },
            {
                "title": "Администрирование",
                "separator": True,
                "items": [
                    {
                        "title": "Пользователи системы",
                        "icon": "person",
                        "link": "/admin/auth/user/",
                    },
                ],
            },
        ],
    },
}
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')