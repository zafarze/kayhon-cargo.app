"""
Management command to generate VAPID keys for Web Push.
Usage: python manage.py generate_vapid_keys
"""
from django.core.management.base import BaseCommand
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64


class Command(BaseCommand):
    help = 'Генерирует VAPID ключи для Web Push уведомлений'

    def handle(self, *args, **options):
        key = ec.generate_private_key(ec.SECP256R1())

        # Приватный ключ (для .env бэкенда)
        priv_bytes = key.private_numbers().private_value.to_bytes(32, 'big')
        private_key = base64.urlsafe_b64encode(priv_bytes).decode().rstrip('=')

        # Публичный ключ (для .env бэкенда + фронтенда)
        pub_bytes = key.public_key().public_bytes(
            serialization.Encoding.X962,
            serialization.PublicFormat.UncompressedPoint
        )
        public_key = base64.urlsafe_b64encode(pub_bytes).decode().rstrip('=')

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('🔑 VAPID ключи сгенерированы!'))
        self.stdout.write('=' * 60)
        self.stdout.write(f'\nДобавь в backend/.env:\n')
        self.stdout.write(self.style.WARNING(f'VAPID_PUBLIC_KEY={public_key}'))
        self.stdout.write(self.style.WARNING(f'VAPID_PRIVATE_KEY={private_key}'))
        self.stdout.write(f'\nДобавь в frontend/.env:\n')
        self.stdout.write(self.style.WARNING(f'VITE_VAPID_PUBLIC_KEY={public_key}'))
        self.stdout.write('\n' + '=' * 60 + '\n')
