import telebot
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from logistics.telegram_bot import bot
import json

@method_decorator(csrf_exempt, name='dispatch')
class TelegramWebhookView(View):
    def post(self, request, *args, **kwargs):
        # Если пришел пустой запрос, игнорируем
        if not request.body:
            return JsonResponse({'status': 'ok'})
            
        try:
            # Получаем JSON от Telegram
            json_string = request.body.decode('utf-8')
            update = telebot.types.Update.de_json(json_string)
            
            # Передаем update в наш бот
            bot.process_new_updates([update])
            
            return JsonResponse({'status': 'ok'})
        except Exception as e:
            # Логируем ошибку, но возвращаем 200, чтобы Telegram не спамил ретраями
            print(f"Error processing webhook: {e}")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=200)

@method_decorator(csrf_exempt, name='dispatch')
class SetWebhookView(View):
    def get(self, request, *args, **kwargs):
        # Используем параметр host, например: ?host=https://my-app.run.app
        host = request.GET.get('host')
        if not host:
            return JsonResponse({'error': 'Please provide ?host=https://your-domain.com'}, status=400)
            
        webhook_url = f"{host.rstrip('/')}/api/telegram/webhook/"
        
        # Устанавливаем вебхук
        bot.remove_webhook()
        success = bot.set_webhook(url=webhook_url)
        
        if success:
            return JsonResponse({'status': 'success', 'webhook_url': webhook_url})
        else:
            return JsonResponse({'status': 'error', 'message': 'Failed to set webhook'})
