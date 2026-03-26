import json
import requests
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from django.db.models import Q  # <--- Добавили импорт Q для поиска
from django.utils import timezone # <--- Вынесли импорт времени наверх
from django.db import transaction

# 👇 Добавили Message в импорты моделей
from logistics.models import DeliveryRequest, ClientProfile, Package, Message
from logistics.serializers import DeliveryRequestSerializer

TELEGRAM_BOT_TOKEN = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
TELEGRAM_ADMIN_CHAT_ID = getattr(settings, 'TELEGRAM_ADMIN_CHAT_ID', None)

def send_telegram_message(chat_id, text):
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    try:
        requests.post(url, json=payload)
    except Exception as e:
        print("Error sending telegram message:", e)

@api_view(['POST'])
@permission_classes([AllowAny])  # Пока открыто для Telegram Mini App, можно добавить свою авторизацию
def request_delivery(request):
    """
    Создание заявки на доставку клиентом
    """
    client_code = request.data.get('client_code')
    package_ids = request.data.get('package_ids', [])
    address = request.data.get('address')
    phone = request.data.get('phone')
    comment = request.data.get('comment', '')

    if not client_code or not package_ids or not address or not phone:
        return Response({"error": "Отсутствуют обязательные поля (client_code, package_ids, address, phone)"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        client = ClientProfile.objects.get(client_code=client_code)
    except ClientProfile.DoesNotExist:
        return Response({"error": "Клиент не найден"}, status=status.HTTP_404_NOT_FOUND)

    packages = Package.objects.filter(id__in=package_ids, client=client, status='arrived_dushanbe')
    if not packages.exists():
        return Response({"error": "Выбранные посылки не найдены или не готовы к доставке (не на складе)"}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        delivery = DeliveryRequest.objects.create(
            client=client,
            address=address,
            phone=phone,
            comment=comment
        )
        delivery.packages.set(packages)

        # Обновляем статусы посылок на "В доставке"
        for pkg in packages:
            pkg.status = 'in_delivery'
            pkg.save()
    
    # Отправка уведомления админу в Телеграм
    if TELEGRAM_ADMIN_CHAT_ID:
        package_info = "\n".join([f"- {p.track_code} ({p.weight} кг)" for p in packages])
        message = (
            f"🚀 <b>Новая заявка на доставку!</b>\n\n"
            f"👤 <b>Клиент:</b> {client.client_code} ({client.user.first_name})\n"
            f"📍 <b>Адрес:</b> {address}\n"
            f"📞 <b>Телефон:</b> {phone}\n"
            f"📝 <b>Комментарий:</b> {comment}\n\n"
            f"📦 <b>Посылки:</b>\n{package_info}"
        )
        send_telegram_message(TELEGRAM_ADMIN_CHAT_ID, message)

    serializer = DeliveryRequestSerializer(delivery)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_deliveries(request):
    """
    Список заявок (Для админа/курьера)
    """
    if request.user.is_staff or (hasattr(request.user, 'clientprofile') and request.user.clientprofile.role in ['admin', 'manager']):
        deliveries = DeliveryRequest.objects.all()
    else:
        # Курьер видит только свои или новые
        deliveries = DeliveryRequest.objects.filter(Q(courier=request.user) | Q(status='pending'))
        
    serializer = DeliveryRequestSerializer(deliveries, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_delivery_status(request, pk):
    """
    Изменение статуса доставки (Принято/Доставлено)
    """
    try:
        delivery = DeliveryRequest.objects.get(pk=pk)
    except DeliveryRequest.DoesNotExist:
        return Response({"error": "Заявка не найдена"}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    if new_status not in ['pending', 'accepted', 'delivered', 'cancelled']:
        return Response({"error": "Недопустимый статус"}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        if new_status == 'accepted':
            delivery.courier = request.user
            delivery.accepted_at = timezone.now()
        elif new_status == 'delivered':
            delivery.delivered_at = timezone.now()

        delivery.status = new_status
        delivery.save()

        # Если доставлено, обновляем статусы посылок
        if new_status == 'delivered':
            for pkg in delivery.packages.all():
                pkg.status = 'delivered'
                pkg.save()
        elif new_status == 'accepted':
            # Если вернули из 'delivered' в 'accepted' (в пути)
            for pkg in delivery.packages.all():
                pkg.status = 'in_delivery'
                pkg.save()

        # =======================================================
        # 👇 НОВОЕ: АВТО-СООБЩЕНИЕ ВО ВНУТРЕННИЙ ЧАТ 👇
        # =======================================================
        chat_msg = ""
        if new_status == 'accepted':
            chat_msg = "🚚 Ваша заявка на доставку принята курьером! Ожидайте доставку по вашему адресу."
        elif new_status == 'delivered':
            chat_msg = "✅ Ваши посылки успешно доставлены! Спасибо, что выбираете Kayhon Cargo."
        elif new_status == 'cancelled':
            chat_msg = "❌ Ваша заявка на доставку была отменена."

        if chat_msg:
            Message.objects.create(
                sender=request.user,  # Сообщение отправится от имени админа/курьера, который нажал кнопку
                receiver=delivery.client.user, # Получатель - владелец заявки
                text=chat_msg
            )
        # =======================================================

    # Уведомление клиенту (в Телеграм - сработает, если когда-нибудь добавите telegram_id)
    if hasattr(delivery.client, 'telegram_id') and delivery.client.telegram_id:
        if new_status == 'accepted':
            msg = f"🚚 Ваша заявка на доставку принята курьером!\nОжидайте доставку в ближайшее время."
            send_telegram_message(delivery.client.telegram_id, msg)
        elif new_status == 'delivered':
            msg = f"✅ Ваши посылки успешно доставлены!"
            send_telegram_message(delivery.client.telegram_id, msg)

    return Response({"message": "Статус обновлен"}, status=status.HTTP_200_OK)