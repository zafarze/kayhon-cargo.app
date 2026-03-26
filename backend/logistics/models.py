from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal, InvalidOperation # <--- ДОБАВИЛИ InvalidOperation
import uuid
import os

def get_avatar_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    return os.path.join('avatars/', filename)

def get_package_photo_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    return os.path.join('package_photos/', filename)

# 1. Профиль клиента / сотрудника
class ClientProfile(models.Model):
    ROLE_CHOICES = [
        ('client', 'Клиент'),
        ('admin', 'Администратор'),
        ('manager', 'Менеджер'),
        ('warehouse', 'Складчик'),
        ('courier', 'Доставщик'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=20, unique=True, verbose_name="Телефон")
    address = models.TextField(blank=True, null=True, verbose_name="Адрес")
    client_code = models.CharField(max_length=20, unique=True, blank=True, verbose_name="Код клиента")
    qr_code_data = models.CharField(max_length=100, blank=True, verbose_name="Данные QR")
    avatar = models.ImageField(upload_to=get_avatar_upload_path, blank=True, null=True, verbose_name="Фото профиля")
    
    # --- ДОБАВЛЕНО НОВОЕ ПОЛЕ РОЛИ ---
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='client', verbose_name="Роль")

    # --- TELEGRAM FIELDS ---
    telegram_id = models.CharField(max_length=100, unique=True, blank=True, null=True, verbose_name="Telegram ID")
    tg_language = models.CharField(max_length=10, default='ru', verbose_name="Язык в ТГ")
    def save(self, *args, **kwargs):
        if not self.client_code and self.user.username:
            first_name = self.user.first_name if self.user.first_name else "Client"
            clean_name = first_name.replace(" ", "")
            digits = self.phone_number[-4:] if len(self.phone_number) >= 4 else "0000"
            
            base_code = f"{clean_name}{digits}"
            code = base_code
            counter = 1
            while ClientProfile.objects.filter(client_code=code).exists():
                code = f"{base_code}-{counter}"
                counter += 1
            
            self.client_code = code
            self.qr_code_data = f"CLIENT:{code}"
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.client_code} ({self.user.first_name}) - {self.get_role_display()}"

    class Meta:
        verbose_name = "Профиль пользователя"
        verbose_name_plural = "Профили пользователей"


# 2. Модель посылки
class Package(models.Model):
    STATUS_CHOICES = [
        ('expected', '⏳  Едет на склад в Китае'),
        ('china_warehouse', '🇨🇳 📦На складе в Китае'),
        ('in_transit', '🚛 В пути (Фура)'),
        ('arrived_dushanbe', '🇹🇯 Прибыл в Душанбе'),
        ('ready_for_pickup', '📦 Готов к выдаче'),
        ('delivered', '✅ Выдан клиенту'),
        ('rejected', '❌ Отклонено / Запрещено'),
    ]

    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='packages', verbose_name="Владелец")
    track_code = models.CharField(max_length=100, unique=True, verbose_name="Трек-код")
    description = models.CharField(max_length=255, blank=True, verbose_name="Описание")
    
    weight = models.FloatField(default=0.0, verbose_name="Вес (кг)")
    photo = models.ImageField(upload_to=get_package_photo_upload_path, blank=True, null=True, verbose_name="Фото посылки")
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='china_warehouse', verbose_name="Статус")
    shelf_location = models.CharField(max_length=20, blank=True, null=True, verbose_name="Ячейка")
    
    # --- ФИНАНСЫ ---
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=5.00, verbose_name="Цена за кг (с.)")
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="К оплате (с.)")
    
    is_paid = models.BooleanField(default=False, verbose_name="Оплачено?")
    payment_date = models.DateTimeField(blank=True, null=True, verbose_name="Дата оплаты")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")

    def save(self, *args, **kwargs):
        # Если посылка новая, подставляем текущую цену из настроек, если цена не была задана явно (осталась дефолтной 5.00)
        if not self.pk and self.price_per_kg == Decimal('5.00'):
            try:
                self.price_per_kg = CompanySettings.get().price_china_dushanbe
            except Exception:
                pass

        try:
            weight_dec = Decimal(str(self.weight))
            self.total_price = weight_dec * self.price_per_kg
        # <--- ИСПРАВЛЕННЫЙ БЛОК EXCEPT --->
        except (ValueError, TypeError, InvalidOperation):
            self.total_price = Decimal('0.00')
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.track_code} - {self.client.client_code}"

    class Meta:
        verbose_name = "Посылка"
        verbose_name_plural = "Посылки"


class DeliveryRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Ожидает курьера'),
        ('accepted', 'Принята курьером'),
        ('delivered', 'Доставлено'),
        ('cancelled', 'Отменено'),
    ]

    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='delivery_requests', verbose_name="Клиент")
    packages = models.ManyToManyField(Package, related_name='delivery_requests', verbose_name="Посылки")
    courier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deliveries', verbose_name="Курьер")
    
    address = models.TextField(verbose_name="Адрес доставки")
    phone = models.CharField(max_length=20, verbose_name="Телефон для связи")
    comment = models.TextField(blank=True, null=True, verbose_name="Комментарий клиента")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Статус доставки")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создана")
    accepted_at = models.DateTimeField(null=True, blank=True, verbose_name="Время принятия")
    delivered_at = models.DateTimeField(null=True, blank=True, verbose_name="Время доставки")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлена")

    class Meta:
        verbose_name = "Заявка на доставку"
        verbose_name_plural = "Заявки на доставку"
        ordering = ['-created_at']

    def __str__(self):
        return f"Доставка #{self.id} для {self.client.client_code}"

class Application(models.Model):
    STATUS_CHOICES = [
        ('new', '🔥 Новая заявка'),
        ('contacted', '📞 В обработке'),
        ('completed', '✅ Клиент зарегистрирован'),
        ('canceled', '❌ Отмена'),
    ]

    full_name = models.CharField(max_length=100, verbose_name="Имя клиента")
    phone_number = models.CharField(max_length=20, verbose_name="Телефон")
    description = models.TextField(blank=True, verbose_name="Сообщение (Что везем?)")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', verbose_name="Статус")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")

    def __str__(self):
        return f"{self.full_name} - {self.phone_number}"

    class Meta:
        verbose_name = "Заявка"
        verbose_name_plural = "Заявки"


class PackageHistory(models.Model):
    package = models.ForeignKey(Package, on_delete=models.CASCADE, related_name='history', verbose_name="Посылка")
    status = models.CharField(max_length=50, choices=Package.STATUS_CHOICES, verbose_name="Статус")
    location = models.CharField(max_length=100, blank=True, verbose_name="Локация (Город/Склад)")
    
    # 👇 НОВОЕ ПОЛЕ: Кто изменил статус? (Может быть null для старых записей или системных)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Кем изменено")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата события")

    def __str__(self):
        return f"{self.package.track_code} - {self.status}"

    class Meta:
        verbose_name = "Запись истории"
        verbose_name_plural = "История перемещений"
        ordering = ['-created_at']


class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages', verbose_name="Отправитель")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages', null=True, blank=True, verbose_name="Получатель")
    text = models.TextField(verbose_name="Текст сообщения")
    is_read = models.BooleanField(default=False, verbose_name="Прочитано?")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username if self.receiver else 'All'}: {self.text[:20]}"

    class Meta:
        verbose_name = "Сообщение"
        verbose_name_plural = "Сообщения"
        ordering = ['created_at']

class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', verbose_name="Получатель")
    text = models.CharField(max_length=255, verbose_name="Текст уведомления")
    is_read = models.BooleanField(default=False, verbose_name="Прочитано?")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")

    def __str__(self):
        return f"{self.recipient.username}: {self.text}"

    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
        ordering = ['-created_at']

class ProhibitedItem(models.Model):
    keyword = models.CharField(max_length=255, unique=True, verbose_name="Ключевое слово")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата добавления")

    def __str__(self):
        return self.keyword

    class Meta:
        verbose_name = "Запрещенный товар"
        verbose_name_plural = "Запрещенные товары"
        ordering = ['-created_at']

class CustomDeclaration(models.Model):
    original_name = models.CharField(max_length=255, unique=True, verbose_name="Оригинальное название")
    display_name = models.CharField(max_length=255, verbose_name="Отображаемое название")
    is_deleted = models.BooleanField(default=False, verbose_name="Удалено из списка")

    def __str__(self):
        return self.display_name

    class Meta:
        verbose_name = "Пользовательская декларация"
        verbose_name_plural = "Пользовательские декларации"


class CompanySettings(models.Model):
    """
    Singleton-модель для глобальных настроек компании.
    Редактируется через /admin. Читается ботом при каждом запросе.
    """
    phone_bokhtar = models.CharField(max_length=30, default="+992 000 000 00", verbose_name="Телефон (Бохтар)")
    phone_qubodiyon = models.CharField(max_length=30, default="+992 000 000 00", verbose_name="Телефон (Қубодиён)")
    warehouse_address_ru = models.TextField(
        default="г. Душанбе, ул. Примерная 1",
        verbose_name="Адрес склада (RU)"
    )
    warehouse_address_china = models.TextField(
        default="浙江省义乌市后宅街道柳青路1577号里面C区1楼 2号杜尚别仓库2号门",
        verbose_name="Адрес склада Китай"
    )
    tariff_text_ru = models.TextField(
        default="📦 Тарифы Kayhon Cargo:\n• 1–20 кг: 27 с/кг\n• 21–30 кг: 25 с/кг\n• 31+ кг: 23 с/кг",
        verbose_name="Тарифы (RU)"
    )
    tariff_text_en = models.TextField(
        default="📦 Kayhon Cargo Tariffs:\n• 1–20 kg: 27 TJS/kg\n• 21–30 kg: 25 TJS/kg\n• 31+ kg: 23 TJS/kg",
        verbose_name="Тарифы (EN)"
    )
    tariff_text_tj = models.TextField(
        default="📦 Нархҳои Kayhon Cargo:\n• 1–20 кг: 27 с/кг\n• 21–30 кг: 25 с/кг\n• 31+ кг: 23 с/кг",
        verbose_name="Тарифы (TJ)"
    )
    
    # --- ЦЕНЫ ДЛЯ КАЛЬКУЛЯТОРА И ДОСТАВКИ ---
    price_china_dushanbe = models.DecimalField(
        max_digits=10, decimal_places=2, default=4.50,
        verbose_name="Цена Китай-Душанбе (с./кг)"
    )
    price_dushanbe_home = models.DecimalField(
        max_digits=10, decimal_places=2, default=15.00,
        verbose_name="Цена доставки до дома (с.)"
    )
    kg_per_cube = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        verbose_name="Плотность (кг за м³)"
    )
    price_per_cube = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        verbose_name="Цена за 1 Куб (с. / м³)"
    )

    def __str__(self):
        return "Настройки системы"

    class Meta:
        verbose_name = "Изменить настройки компании"
        verbose_name_plural = "Изменить настройки компании"

    @classmethod
    def get(cls):
        """Возвращает единственный объект настроек, создаёт если нет."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        # Если это обновление существующих настроек, обновим неоплаченные посылки
        if self.pk:
            try:
                old_settings = CompanySettings.objects.get(pk=self.pk)
                if old_settings.price_china_dushanbe != self.price_china_dushanbe:
                    # Обновляем все неоплаченные посылки
                    unpaid_packages = Package.objects.filter(is_paid=False).exclude(status__in=['delivered', 'rejected'])
                    for pkg in unpaid_packages:
                        pkg.price_per_kg = self.price_china_dushanbe
                        pkg.save()
            except CompanySettings.DoesNotExist:
                pass
                
        super().save(*args, **kwargs)


class Expense(models.Model):
    title = models.CharField(max_length=255, verbose_name="Название расхода")
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Сумма")
    date = models.DateField(auto_now_add=True, verbose_name="Дата")
    description = models.TextField(blank=True, null=True, verbose_name="Описание")

    def __str__(self):
        return f"{self.title} - {self.amount} с."

    class Meta:
        verbose_name = "Расход"
        verbose_name_plural = "Расходы"
        ordering = ['-date']


class PushSubscription(models.Model):
    """Хранение подписок Web Push для каждого пользователя."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.TextField(unique=True)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Push: {self.user.first_name} ({self.endpoint[:40]}...)"

    class Meta:
        verbose_name = "Push-подписка"
        verbose_name_plural = "Push-подписки"
