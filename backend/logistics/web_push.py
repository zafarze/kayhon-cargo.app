"""
Утилита для отправки Web Push уведомлений.
"""
import json
import logging
from pywebpush import webpush, WebPushException
from django.conf import settings

logger = logging.getLogger(__name__)


def send_web_push(subscription_info: dict, title: str, body: str, url: str = '/') -> bool:
    """
    Отправляет Web Push уведомление на одного подписчика.
    subscription_info = { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
    """
    try:
        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": "/icon-192.png",
            "badge": "/icon-192.png",
            "url": url,
        })

        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_ADMIN_EMAIL}"}
        )
        return True

    except WebPushException as e:
        logger.warning(f"Web Push failed: {e}")
        # Если подписка протухла (410 Gone) — удаляем её
        if e.response and e.response.status_code == 410:
            from .models import PushSubscription
            PushSubscription.objects.filter(endpoint=subscription_info.get('endpoint')).delete()
            logger.info("Deleted expired push subscription")
        return False
    except Exception as e:
        logger.error(f"Unexpected push error: {e}")
        return False


def send_push_to_user(user, title: str, body: str, url: str = '/'):
    """
    Отправляет Web Push уведомление на все устройства пользователя.
    """
    from .models import PushSubscription
    
    subscriptions = PushSubscription.objects.filter(user=user)
    sent_count = 0

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            }
        }
        if send_web_push(subscription_info, title, body, url):
            sent_count += 1

    return sent_count
