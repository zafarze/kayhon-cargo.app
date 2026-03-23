"""
Вспомогательный модуль для отправки сообщений в Telegram.
Используется из views/packages.py при изменении статуса посылки.
"""
import os
import logging

logger = logging.getLogger(__name__)

def send_telegram_notification(telegram_id: str, text: str) -> bool:
    """
    Отправляет сообщение пользователю в Telegram по его telegram_id.
    Возвращает True при успехе, False при ошибке (не бросает исключений).
    """
    try:
        import telebot
        from django.conf import settings
        
        token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None) or os.getenv('TELEGRAM_BOT_TOKEN', '')
        if not token or ':' not in token:
            logger.warning("TELEGRAM_BOT_TOKEN не настроен — уведомление не отправлено")
            return False
        
        # Создаём временный экземпляр бота (без polling)
        bot = telebot.TeleBot(token, threaded=False)
        bot.send_message(chat_id=str(telegram_id), text=text, parse_mode='HTML')
        logger.info(f"Telegram уведомление отправлено: {telegram_id}")
        return True
        
    except Exception as e:
        # Не падаем — уведомление вспомогательная функция, не критична
        logger.error(f"Ошибка отправки Telegram уведомления ({telegram_id}): {e}")
        return False
