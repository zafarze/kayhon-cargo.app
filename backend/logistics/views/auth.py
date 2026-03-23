from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
# Добавили IsAuthenticated для защиты профиля
from rest_framework.permissions import IsAuthenticated 
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import ClientProfile
# Добавили UserProfileSerializer
from ..serializers import RegisterSerializer, UserProfileSerializer 

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            profile = serializer.save()
            return Response({
                "message": "Успешно зарегистрированы!",
                "client_code": profile.client_code,
                "id": profile.user.id
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request):
        login_input = request.data.get('client_code') 
        password = request.data.get('password')

        if not login_input or not password:
            return Response({"error": "Введите Логин и пароль"}, status=status.HTTP_400_BAD_REQUEST)

        user = None
        client_code_response = None
        is_admin = False

        # 1. Сначала ищем по коду клиента
        try:
            profile = ClientProfile.objects.get(client_code=login_input)
            user = profile.user
            client_code_response = profile.client_code
        except ClientProfile.DoesNotExist:
            # 2. Если не нашли, ищем по username (для админа/менеджера)
            try:
                user = User.objects.get(username=login_input)
                # Если у админа есть профиль, берем его код, иначе null
                if hasattr(user, 'clientprofile'):
                    client_code_response = user.clientprofile.client_code
            except User.DoesNotExist:
                return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)

        # Проверка пароля
        if user.check_password(password):
            if user.is_staff or user.is_superuser:
                is_admin = True
            
            # --- ГЕНЕРИРУЕМ ТОКЕН ---
            refresh = RefreshToken.for_user(user)
            
            return Response({
                "message": "Вход выполнен успешно",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "is_admin": is_admin,
                "client_code": client_code_response,
                "first_name": user.first_name
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Неверный пароль"}, status=status.HTTP_400_BAD_REQUEST)

import hashlib
import hmac
import json
import urllib.parse
from django.conf import settings as django_settings

def _validate_telegram_init_data(init_data: str) -> dict | None:
    """
    Проверяет подпись Telegram initData по официальному алгоритму:
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

    Возвращает распаршенный словарь данных или None если подпись невалидна.
    """
    try:
        parsed = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
        received_hash = parsed.pop('hash', None)
        if not received_hash:
            return None

        # Строим строку для подписи: отсортированные пары key=value через \n
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )

        # Секретный ключ = HMAC-SHA256("WebAppData", BOT_TOKEN)
        bot_token = getattr(django_settings, 'TELEGRAM_BOT_TOKEN', '')
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()

        # Вычисляем ожидаемый hash
        expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected_hash, received_hash):
            return None  # Подпись не совпала — данные подделаны

        # Возвращаем user-объект из initData
        user_str = parsed.get('user', '{}')
        return json.loads(user_str)

    except Exception:
        return None


class TelegramAuthView(APIView):
    """
    Авторизация через Telegram Mini App.

    Принимает:
      - init_data (str) — сырая строка из window.Telegram.WebApp.initData
                          Проверяется HMAC-SHA256 подписью (безопасно).
      - telegram_id (str) — запасной вариант, только в DEBUG=True
                            Никогда не использовать в продакшене!
    """
    def post(self, request):
        init_data = request.data.get('init_data')
        telegram_id = None

        if init_data:
            user_data = _validate_telegram_init_data(init_data)
            if user_data is None:
                return Response(
                    {"error": "Недействительная подпись Telegram. Запрос отклонён."},
                    status=status.HTTP_403_FORBIDDEN
                )
            telegram_id = str(user_data.get('id'))
        else:
            # Fallback: только для разработки
            if not django_settings.DEBUG:
                return Response(
                    {"error": "init_data обязателен в продакшене"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            telegram_id = request.data.get('telegram_id')

        if not telegram_id:
            return Response({"error": "Не удалось определить telegram_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = ClientProfile.objects.get(telegram_id=str(telegram_id))
            user = profile.user

            refresh = RefreshToken.for_user(user)

            return Response({
                "message": "Вход выполнен успешно",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "is_admin": user.is_staff or user.is_superuser,
                "client_code": profile.client_code,
                "first_name": user.first_name
            }, status=status.HTTP_200_OK)

        except ClientProfile.DoesNotExist:
            return Response({"error": "Аккаунт не привязан к этому Telegram ID"}, status=status.HTTP_404_NOT_FOUND)


# --- ОБНОВЛЕННЫЙ КЛАСС ДЛЯ ПРОФИЛЯ ---
class UserMeView(APIView):
    """
    Возвращает и обновляет данные текущего пользователя для шапки (Имя, Роль, Email, Аватар)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        data = request.data

        # 1. Обновляем стандартные поля пользователя (Имя, Email)
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'email' in data:
            user.email = data['email']
        user.save()

        # Получаем или создаем профиль
        profile, created = ClientProfile.objects.get_or_create(
            user=user,
            defaults={'phone_number': user.username} # Заглушка, чтобы не было ошибки уникальности
        )

        # 2. Обновляем аватарку (если она была передана как файл)
        if 'avatar' in request.FILES:
            profile.avatar = request.FILES['avatar']

        # 3. Обновляем дополнительные поля профиля (Телефон, Адрес)
        if 'phone_number' in data:
            profile.phone_number = data['phone_number']
        if 'address' in data:
            profile.address = data['address']
        
        profile.save()

        # Возвращаем обновленные данные обратно на фронтенд
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """Смена пароля авторизованного пользователя"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        # Проверяем старый пароль
        if not user.check_password(old_password):
            return Response({"error": "Старый пароль введен неверно"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Устанавливаем новый
        user.set_password(new_password)
        user.save()
        
        return Response({"message": "Пароль успешно обновлен"}, status=status.HTTP_200_OK)


class SystemUsersView(APIView):
    """
    Возвращает список всех пользователей системы (сотрудников и клиентов).
    Для таблицы "Сотрудники" в админке.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Выводим ТОЛЬКО сотрудников (у которых есть доступ is_staff)
        users = User.objects.filter(is_staff=True).select_related('clientprofile').order_by('-date_joined')

        serializer = UserProfileSerializer(users, many=True)
        return Response(serializer.data)


class CreateEmployeeView(APIView):
    """Создание нового сотрудника администратором"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({"error": "Нет прав для добавления сотрудников"}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        username = data.get('username')
        password = data.get('password')
        first_name = data.get('first_name')
        email = data.get('email', '') # <--- ДОБАВИЛИ ПОЛУЧЕНИЕ EMAIL
        role = data.get('role')

        if not username or not password or not first_name or not role:
            return Response({"error": "Заполните все обязательные поля"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "Логин уже занят. Придумайте другой."}, status=status.HTTP_400_BAD_REQUEST)

        # Создаем юзера с email
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            email=email, # <--- СОХРАНЯЕМ EMAIL
            is_staff=True 
        )

        ClientProfile.objects.create(
            user=user,
            phone_number=username, 
            role=role
        )

        return Response({"message": "Сотрудник успешно добавлен!"}, status=status.HTTP_201_CREATED)

# --- НОВЫЙ КЛАСС ДЛЯ РЕДАКТИРОВАНИЯ И УДАЛЕНИЯ ---
class EmployeeDetailView(APIView):
    """Редактирование и удаление конкретного сотрудника"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        # Удалять может только Супер-Админ
        if not request.user.is_superuser:
            return Response({"error": "Только Супер-Админ может удалять сотрудников"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user_to_delete = User.objects.get(id=pk)
            if user_to_delete.is_superuser:
                return Response({"error": "Нельзя удалить Супер-Админа"}, status=status.HTTP_400_BAD_REQUEST)
            
            user_to_delete.delete()
            return Response({"message": "Сотрудник успешно удален"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({"error": "Нет прав"}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            user_to_edit = User.objects.get(id=pk)
            data = request.data

            if 'first_name' in data: user_to_edit.first_name = data['first_name']
            if 'email' in data: user_to_edit.email = data['email']
            
            # Обновляем пароль только если его передали
            if 'password' in data and data['password'].strip():
                user_to_edit.set_password(data['password'])
            
            user_to_edit.save()

            # Обновляем роль
            if 'role' in data and hasattr(user_to_edit, 'clientprofile'):
                user_to_edit.clientprofile.role = data['role']
                user_to_edit.clientprofile.save()

            return Response({"message": "Данные успешно обновлены!"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)