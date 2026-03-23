# backend/logistics/apps.py
from django.apps import AppConfig

class LogisticsConfig(AppConfig):
    name = 'logistics'

    def ready(self):
        import logistics.signals # <--- Импортируем при старте