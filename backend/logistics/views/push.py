from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.conf import settings
from ..models import PushSubscription


class PushSubscribeView(APIView):
    """
    Клиент отправляет сюда свою подписку после разрешения уведомлений.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        endpoint = request.data.get('endpoint')
        p256dh = request.data.get('keys', {}).get('p256dh')
        auth = request.data.get('keys', {}).get('auth')

        if not endpoint or not p256dh or not auth:
            return Response({"error": "Неполные данные подписки"}, status=status.HTTP_400_BAD_REQUEST)

        # Обновляем или создаём подписку
        PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                'user': request.user,
                'p256dh': p256dh,
                'auth': auth,
            }
        )

        return Response({"message": "Подписка сохранена"}, status=status.HTTP_201_CREATED)


class PushUnsubscribeView(APIView):
    """Удалить подписку при отказе от уведомлений."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        endpoint = request.data.get('endpoint')
        if endpoint:
            PushSubscription.objects.filter(endpoint=endpoint).delete()
        return Response({"message": "Подписка удалена"})


class VapidPublicKeyView(APIView):
    """Отдаёт публичный VAPID ключ для фронтенда."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "public_key": settings.VAPID_PUBLIC_KEY
        })


class SendTestPushView(APIView):
    """Отправить тестовое push-уведомление самому себе."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from ..web_push import send_push_to_user
        count = send_push_to_user(
            request.user,
            title="🔔 Kayhon Cargo",
            body="Тестовое уведомление. Push работает!",
            url="/"
        )
        return Response({"message": f"Отправлено на {count} устройств(а)"})
