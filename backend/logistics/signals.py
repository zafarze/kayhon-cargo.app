from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.db import transaction
from .models import Application, Notification

# 1. Когда приходит новая заявка -> Уведомляем админов (с защитой транзакций)
@receiver(post_save, sender=Application)
def notify_admins_on_new_app(sender, instance, created, **kwargs):
    if created:
        def create_notifications():
            admins = User.objects.filter(is_staff=True)
            # Собираем все уведомления в список
            notifications = [
                Notification(
                    recipient=admin,
                    text=f"🔥 Новая заявка: {instance.full_name} ({instance.phone_number})"
                ) for admin in admins
            ]
            # Сохраняем одним быстрым запросом
            if notifications:
                Notification.objects.bulk_create(notifications)
        
        # Оборачиваем в on_commit: функция выполнится только после успешного сохранения заявки в БД
        transaction.on_commit(create_notifications)

# Автоматические уведомления клиентам (сигнал для PackageHistory) полностью удалены, 
# так как теперь рассылка контролируется вручную с фронтенда.