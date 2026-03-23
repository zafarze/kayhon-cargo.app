from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from .models import ClientProfile, Package, DeliveryRequest, CompanySettings, Expense


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ('📞 Контакты', {
            'fields': ('phone_bokhtar', 'phone_qubodiyon')
        }),
        ('🏢 Адреса складов', {
            'fields': ('warehouse_address_ru', 'warehouse_address_china')
        }),
        ('📊 Тарифы', {
            'fields': ('tariff_text_ru', 'tariff_text_en', 'tariff_text_tj')
        }),
    )

    def has_add_permission(self, request):
        # Только один объект настроек — запрещаем создавать ещё
        return not CompanySettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


# 1. Встраиваем профиль клиента в карточку Пользователя
class ClientProfileInline(admin.StackedInline):
    model = ClientProfile
    can_delete = False
    verbose_name_plural = 'Профиль Kayhon Cargo'
    # Показываем поля только для чтения, если нужно
    readonly_fields = ('client_code', 'qr_code_data')

# Переопределяем стандартную админку пользователя
class UserAdmin(BaseUserAdmin):
    inlines = (ClientProfileInline,)
    list_display = ('username', 'first_name', 'get_client_code', 'is_staff')
    
    def get_client_code(self, instance):
        # Безопасно получаем код клиента, если профиль существует
        if hasattr(instance, 'clientprofile'):
            return instance.clientprofile.client_code
        return "-"
    get_client_code.short_description = 'Код клиента'

# Перерегистрируем User
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# 2. Настраиваем Админку для Посылок
@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    # Какие поля показывать в таблице
    list_display = ('track_code', 'client_info', 'status_colored', 'weight', 'total_price_display', 'is_paid', 'created_at')
    
    # Фильтры справа (очень удобно!)
    list_filter = ('status', 'is_paid', 'created_at')
    
    # Поиск (по треку, имени клиента, коду клиента, телефону)
    search_fields = ('track_code', 'client__client_code', 'client__phone_number', 'client__user__first_name')
    
    # Поля, которые нельзя менять вручную (цена считается сама)
    readonly_fields = ('total_price', 'created_at', 'updated_at')
    
    # Группировка полей внутри карточки
    fieldsets = (
        ('📦 Основная информация', {
            'fields': ('track_code', 'client', 'description', 'photo')
        }),
        ('📍 Логистика', {
            'fields': ('status', 'weight', 'shelf_location')
        }),
        ('💰 Финансы (Авторасчет)', {
            'fields': ('price_per_kg', 'extra_cost', 'total_price', 'is_paid', 'payment_date'),
            'classes': ('collapse',), # Можно свернуть этот блок
        }),
        ('🕒 Даты', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    # Красивое отображение клиента
    def client_info(self, obj):
        return f"{obj.client.client_code} ({obj.client.user.first_name})"
    client_info.short_description = 'Клиент'

    # Цветной статус
    def status_colored(self, obj):
        colors = {
            'expected': 'gray',       # <--- ДОБАВИТЬ ЭТО (Серый цвет для ожидаемых)
            'china_warehouse': 'orange',
            'in_transit': 'blue',
            'arrived_dushanbe': 'purple',
            'ready_for_pickup': 'green',
            'delivered': 'gray', # Можно delivered сделать 'black' или 'green' потемнее
        }
        color = colors.get(obj.status, 'black')
        # Получаем читаемое название статуса
        status_label = dict(Package.STATUS_CHOICES).get(obj.status, obj.status)
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, status_label
        )
    status_colored.short_description = 'Статус'

    # Отображение цены с валютой
    def total_price_display(self, obj):
        return f"{obj.total_price} с."
    total_price_display.short_description = 'Цена'

@admin.register(DeliveryRequest)
class DeliveryRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'courier', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('client__client_code', 'client__user__first_name', 'phone', 'address')
    date_hierarchy = 'created_at'
    raw_id_fields = ('client', 'courier')
    filter_horizontal = ('packages',)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('title', 'amount', 'date', 'description')
    list_filter = ('date',)
    search_fields = ('title', 'description')
    date_hierarchy = 'date'
