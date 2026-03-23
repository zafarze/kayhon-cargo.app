import os

from django.core.asgi import get_asgi_application

# БЫЛО: 'core.settings' -> СТАЛО: 'config.settings'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_asgi_application()