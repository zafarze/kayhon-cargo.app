import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from logistics.models import CompanySettings
s = CompanySettings.get()
s.tariff_text_ru = """Наш тариф:

Доставка
🚚 от кг - 2.5$
📦 от куб - 250$

Срок доставки 15-25 дней

Крупногабаритные грузы рассчитываются как куб!!!"""
s.save()
print("✅ Тариф обновлён!")
print(s.tariff_text_ru)
