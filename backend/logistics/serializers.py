from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Package, ClientProfile, Application, PackageHistory, Notification, DeliveryRequest, ProhibitedItem, Expense
from django.utils.timesince import timesince

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

# 1. Сериалайзер для Клиента
class ClientListSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)
    last_login = serializers.DateTimeField(source='user.last_login', read_only=True)
    packages_count = serializers.IntegerField(source='packages.count', read_only=True)

    class Meta:
        model = ClientProfile
        fields = ['id', 'client_code', 'phone_number', 'address', 'first_name', 'date_joined', 'packages_count', 'last_login']

# --- СЕРИАЛАЙЗЕР: ИСТОРИЯ ---
class PackageHistorySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PackageHistory
        fields = ['status', 'status_display', 'location', 'created_at']

# 2. Сериалайзер для Посылок
class PackageSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    history = PackageHistorySerializer(many=True, read_only=True)
    client_info = serializers.SerializerMethodField() 
    
    # --- ДОБАВЛЕННЫЕ ПОЛЯ ДЛЯ ДОСТАВКИ ---
    courier_status = serializers.SerializerMethodField()
    delivered_at = serializers.SerializerMethodField()
    
    class Meta:
        model = Package
        fields = [
            'id', 'track_code', 'description', 
            'client', 
            'client_info', 
            'weight', 'status', 'status_display',
            'shelf_location', 'created_at', 'photo',
            'price_per_kg', 'total_price', 
            'is_paid', 'payment_date',
            'history',
            'courier_status', 'delivered_at' # <--- Не забываем добавить их сюда
        ]

    def get_client_info(self, obj):
        # Используем getattr, чтобы избежать случайных SQL-запросов
        if getattr(obj, 'client', None):
            return {
                "client_code": obj.client.client_code,
                "first_name": obj.client.user.first_name if getattr(obj.client, 'user', None) else "Без имени",
                "phone_number": obj.client.phone_number
            }
        return None

    # --- НОВЫЕ МЕТОДЫ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ ИЗ ЗАЯВКИ НА ДОСТАВКУ ---
    def get_latest_delivery(self, obj):
        # Берем самую свежую заявку на доставку для конкретной посылки
        return obj.delivery_requests.order_by('-created_at').first()

    def get_courier_status(self, obj):
        delivery = self.get_latest_delivery(obj)
        if delivery:
            return delivery.status
        return None

    def get_delivered_at(self, obj):
        delivery = self.get_latest_delivery(obj)
        if delivery and delivery.delivered_at:
            return delivery.delivered_at
        return None

# 3. Сериалайзер для Регистрации
class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    phone_number = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate_phone_number(self, value):
        if ClientProfile.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Пользователь с таким номером уже существует!")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['phone_number'], 
            first_name=validated_data['first_name'],
            password=validated_data['password']
        )
        profile = ClientProfile.objects.create(
            user=user,
            phone_number=validated_data['phone_number']
        )
        return profile

# 4. Сериалайзер для ЗАЯВОК
class ApplicationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Application
        fields = ['id', 'full_name', 'phone_number', 'description', 'status', 'status_display', 'created_at']

class ProhibitedItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProhibitedItem
        fields = '__all__'

class DeliveryRequestSerializer(serializers.ModelSerializer):
    client_code = serializers.CharField(source='client.client_code', read_only=True)
    client_name = serializers.CharField(source='client.user.first_name', read_only=True)
    courier_name = serializers.CharField(source='courier.first_name', read_only=True)
    packages_details = PackageSerializer(source='packages', many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = DeliveryRequest
        fields = [
            'id', 'client', 'client_code', 'client_name',
            'packages', 'packages_details', 'courier', 'courier_name',
            'address', 'phone', 'comment', 'status', 'status_display',
            'created_at', 'accepted_at', 'delivered_at', 'updated_at'
        ]
        read_only_fields = ['status', 'courier', 'client']

# 5. Сериалайзер для УВЕДОМЛЕНИЙ
class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'text', 'is_read', 'created_at', 'time_ago']

    def get_time_ago(self, obj):
        return timesince(obj.created_at) + " назад"


# =====================================================================
# ИСПРАВЛЕННЫЙ СЕРИАЛАЙЗЕР ПРОФИЛЯ
# =====================================================================
class UserProfileSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField() 
    address = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    client_code = serializers.SerializerMethodField()
    unread_messages = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'email', 'role', 'avatar', 'address', 'phone_number', 'client_code', 'unread_messages'] 

    def get_role(self, obj):
        if obj.is_superuser: return "Супер-Админ"
        if obj.is_staff: return "Администратор"
        return "Клиент"

    def get_avatar(self, obj):
        # Безопасная проверка OneToOne связи
        if getattr(obj, 'clientprofile', None) and obj.clientprofile.avatar:
            return obj.clientprofile.avatar.url
        return None

    def get_address(self, obj):
        if getattr(obj, 'clientprofile', None):
            return obj.clientprofile.address
        return None

    def get_phone_number(self, obj):
        if getattr(obj, 'clientprofile', None):
            return obj.clientprofile.phone_number
        return None

    def get_client_code(self, obj):
        if getattr(obj, 'clientprofile', None):
            return obj.clientprofile.client_code
        return None

    def get_unread_messages(self, obj):
        from .models import Message
        if obj.is_staff or obj.is_superuser:
            return Message.objects.filter(receiver__isnull=True, is_read=False).count()
        return Message.objects.filter(receiver=obj, is_read=False).count()