from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from django.db.models import Sum
from django.db import transaction
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta

# Импортируем модели
from ..models import Package, ClientProfile, Application, Notification, PackageHistory, DeliveryRequest, Expense
# Импортируем сериалайзеры
from ..serializers import PackageSerializer, NotificationSerializer

class AdminDashboardView(APIView):
    """
    Главный экран админа: Статистика + Недавние посылки
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        # 1. Сбор простой статистики
        total_packages = Package.objects.count()
        in_transit = Package.objects.filter(status='in_transit').count()
        total_users = ClientProfile.objects.count()
        new_applications = Application.objects.filter(status='new').count()
        new_deliveries = DeliveryRequest.objects.filter(status='pending').count()
        unknown_packages = Package.objects.filter(client__user__first_name="Неизвестный").count()

        # 2. Подсчет финансов (Сумма всех цен)
        total_money = Package.objects.aggregate(Sum('total_price'))['total_price__sum'] or 0

        # --- НОВЫЕ ФИНАНСОВЫЕ МЕТРИКИ ---
        total_weight = Package.objects.aggregate(Sum('weight'))['weight__sum'] or 0
        avg_price_per_kg = float(total_money) / float(total_weight) if total_weight > 0 else 0

        # Неоплаченные посылки на складе
        unpaid_debt = Package.objects.filter(
            status='arrived_dushanbe'
        ).aggregate(Sum('total_price'))['total_price__sum'] or 0

        # Расходы и прибыль
        total_expenses = Expense.objects.aggregate(Sum('amount'))['amount__sum'] or 0
        net_profit = float(total_money) - float(unpaid_debt) - float(total_expenses)

        # Выручка по дням (за последние 30 дней) для графиков
        thirty_days_ago = timezone.now() - timedelta(days=30)
        daily_stats = Package.objects.filter(created_at__gte=thirty_days_ago).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            revenue=Sum('total_price'),
            weight=Sum('weight')
        ).order_by('date')

        revenue_by_date = [
            {
                "date": stat['date'].strftime('%d.%m'),
                "revenue": float(stat['revenue'] or 0),
                "weight": float(stat['weight'] or 0)
            } for stat in daily_stats
        ]

        # Выручка по дням может не содержать всех дней, но на фронте recharts справится
        
        # Топ клиенты по выручке
        top_clients_qs = ClientProfile.objects.annotate(
            total_revenue=Sum('packages__total_price')
        ).exclude(total_revenue=None).order_by('-total_revenue')[:5]

        top_clients = [
            {
                "client_code": c.client_code,
                "first_name": c.user.first_name,
                "revenue": float(c.total_revenue or 0)
            } for c in top_clients_qs
        ]


        # 3. Получение последних 50 посылок для таблицы
        packages = Package.objects.select_related('client', 'client__user').order_by('-created_at')[:50]
        serializer = PackageSerializer(packages, many=True)

        return Response({
            "stats": {
                "total_packages": total_packages,
                "in_transit": in_transit,
                "total_users": total_users,
                "new_applications": new_applications,
                "new_deliveries": new_deliveries,
                "unknown_packages": unknown_packages,
                "total_money": float(total_money),
                "total_weight": float(total_weight),
                "avg_price_per_kg": float(avg_price_per_kg),
                "unpaid_debt": float(unpaid_debt),
                "total_expenses": float(total_expenses),
                "net_profit": float(net_profit),
                "revenue_by_date": revenue_by_date,
                "top_clients": top_clients,
            },
            "recent_packages": serializer.data
        })


class NotificationView(APIView):
    """
    Работа с уведомлениями (колокольчик в шапке)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получить список последних уведомлений"""
        # Берем последние 10 уведомлений текущего пользователя (свежие сверху)
        # И только те, которые были созданы после регистрации пользователя
        notifs = Notification.objects.filter(
            recipient=request.user,
            created_at__gte=request.user.date_joined
        ).order_by('-created_at')[:10]
        serializer = NotificationSerializer(notifs, many=True)
        
        # Считаем количество только НЕПРОЧИТАННЫХ (для красной точки)
        unread_count = Notification.objects.filter(
            recipient=request.user, 
            is_read=False,
            created_at__gte=request.user.date_joined
        ).count()
        
        return Response({
            "notifications": serializer.data,
            "unread_count": unread_count
        })

    def patch(self, request):
        """Пометить все уведомления как прочитанные (когда открыл меню)"""
        Notification.objects.filter(
            recipient=request.user, 
            is_read=False,
            created_at__gte=request.user.date_joined
        ).update(is_read=True)
        return Response({"status": "ok", "message": "All marked as read"})


class BroadcastNotificationView(APIView):
    """
    Массовая рассылка уведомлений клиентам.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Получаем только тех клиентов, у которых есть посылки на стадии "Прибыл в Душанбе" (после фасовки)
        clients_with_packages = ClientProfile.objects.filter(
            packages__status='arrived_dushanbe'
        ).distinct()

        data = []
        for client in clients_with_packages:
            pkg_count = client.packages.filter(status='arrived_dushanbe').count()
            data.append({
                "client_code": client.client_code,
                "first_name": client.user.first_name,
                "phone": client.phone_number,
                "package_count": pkg_count,
            })

        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        broadcast_type = request.data.get('type') # 'all' или 'arrived'
        message_text = request.data.get('message', '').strip()
        client_codes = request.data.get('client_codes', []) 

        if not message_text:
            return Response({"error": "Текст сообщения не может быть пустым"}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        from ..telegram_notify import send_telegram_notification
        from ..models import Message

        tg_success_count = 0
        tg_fail_count = 0

        with transaction.atomic():
            if broadcast_type == 'all':
                # Рассылка абсолютно всем (например, "Склад завтра не работает")
                clients = ClientProfile.objects.exclude(client_code="UNKNOWN").select_related('user')
                notifications = []
                chat_messages = []
                for client in clients:
                    notifications.append(Notification(recipient=client.user, text=message_text))
                    chat_messages.append(Message(sender=request.user, receiver=client.user, text=message_text))
                    if client.telegram_id:
                        notification_text = f"📢 *Системное сообщение:*\n\n{message_text}"
                        if send_telegram_notification(client.telegram_id, notification_text):
                            tg_success_count += 1
                        else:
                            tg_fail_count += 1

                if notifications:
                    Notification.objects.bulk_create(notifications)
                    Message.objects.bulk_create(chat_messages)
                    created_count = len(clients)

            elif broadcast_type == 'arrived':
                # Рассылка о готовности (Меняем статус на ready_for_pickup)
                if not client_codes:
                    return Response({"error": "Выберите хотя бы одного клиента"}, status=status.HTTP_400_BAD_REQUEST)
                
                clients = ClientProfile.objects.filter(client_code__in=client_codes).select_related('user')
                notifications = []
                chat_messages = []
                history_records = []
                packages_to_update = []

                for client in clients:
                    notifications.append(Notification(recipient=client.user, text=message_text))
                    chat_messages.append(Message(sender=request.user, receiver=client.user, text=message_text))
                    
                    if client.telegram_id:
                        notification_text = f"📦 *Ваши посылки прибыли!*\n\n{message_text}"
                        if send_telegram_notification(client.telegram_id, notification_text):
                            tg_success_count += 1
                        else:
                            tg_fail_count += 1
                    
                    # Ищем их посылки и переводим в статус "Готов к выдаче"
                    user_packages = Package.objects.filter(client=client, status='arrived_dushanbe')
                    for pkg in user_packages:
                        pkg.status = 'ready_for_pickup'
                        packages_to_update.append(pkg)
                        history_records.append(
                            PackageHistory(package=pkg, status='ready_for_pickup', location='Душанбе (Доступно к выдаче)')
                        )

                # Массовое сохранение (работает очень быстро)
                if notifications:
                    Notification.objects.bulk_create(notifications)
                    Message.objects.bulk_create(chat_messages)
                    created_count = len(clients)
                if packages_to_update:
                    Package.objects.bulk_update(packages_to_update, ['status'])
                if history_records:
                    PackageHistory.objects.bulk_create(history_records)

        response_msg = f"Успешно отправлено {created_count} клиентам!"
        if tg_success_count > 0 or tg_fail_count > 0:
            response_msg += f" (Telegram: {tg_success_count} доставлено, {tg_fail_count} ошибок)"

        return Response({"message": response_msg}, status=status.HTTP_200_OK)
