from django.core.management.base import BaseCommand
from logistics.telegram_bot import bot

class Command(BaseCommand):
    help = 'Runs the Telegram Bot via long-polling (for local dev only)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Kayhon Cargo Telegram Bot started via Long Polling!"))
        # Убираем вебхук, чтобы long-polling мог работать
        bot.remove_webhook()
        bot.infinity_polling(timeout=10, long_polling_timeout=5)
