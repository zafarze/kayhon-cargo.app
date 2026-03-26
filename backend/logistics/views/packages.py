# backend/logistics/views/packages.py

import re
import numpy as np
import cv2
from decimal import Decimal, InvalidOperation
import os
import requests
import base64
import json

from rest_framework.views import APIView
from rest_framework import generics, filters, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404

import openpyxl 
import logging

from ..models import Package, ClientProfile, PackageHistory, Notification, Message # <--- Добавили Notification, Message
from ..serializers import PackageSerializer
from ..telegram_notify import send_telegram_notification
from ..permissions import IsEmployee, IsAdminOrManager, IsWarehouse

logger = logging.getLogger(__name__)

# ==========================================
# 🔥 ИНИЦИАЛИЗАЦИЯ ИИ (Gemini Vision)
# ==========================================
logger.info("🚀 Подготовка нейросети Gemini Vision...")

def extract_client_from_photo(photo_file):
    """
    Принимает фото, находит код клиента, трек-код и описание товара с помощью Gemini 1.5 Flash.
    Возвращает словарь: {"client": ClientProfile|None, "description": str, "track_code": str|None}
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("❌ GEMINI_API_KEY не найден в окружении!")
            return None
            
        photo_bytes = photo_file.read()
        encoded_image = base64.b64encode(photo_bytes).decode('utf-8')
        
        prompt = """Analyze this shipping label and extract the following information in strict JSON format:
{
    "client_code": "The client identifier code if visible (e.g. +Sobirjon+025326868, ZOIREHOH, C47, САДДАМ, etc. usually 2-30 chars, might have +, -, _, or brackets). Return null if not found.",
    "track_code": "The tracking number (typically starts with JT, YT, ZTO, SF, or is a long number of 12-20 digits). Return null if not found.",
    "description": "Product description and quantity (usually inside Chinese brackets 【】 or followed by 件). Return null if not found.",
    "full_text": "All raw text found on the label as a single space-separated string."
}
IMPORTANT: Return ONLY the JSON object. No Markdown, no code blocks (like ```json), just the raw JSON."""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": encoded_image
                        }
                    }
                ]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
            }
        }
        
        logger.info("🚀 Отправка фото этикетки в Gemini 1.5 Flash для глубокого анализа...")
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=20)
        
        if resp.status_code == 200:
            data = resp.json()
            text_response = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
            
            try:
                parsed_data = json.loads(text_response)
            except json.JSONDecodeError:
                # Если Gemini вернул текст с markdown
                text_response = text_response.replace('```json', '').replace('```', '').strip()
                parsed_data = json.loads(text_response)
                
            logger.info(f"🤖 Ответ Gemini: {parsed_data}")
            
            full_text = parsed_data.get("full_text", "")
            extracted_client_code = parsed_data.get("client_code")
            extracted_desc = parsed_data.get("description")
            extracted_track = parsed_data.get("track_code")
            
            # 1. Поиск клиента в БД
            matched_client = None
            potential_codes = []
            
            if extracted_client_code and isinstance(extracted_client_code, str):
                potential_codes.append(extracted_client_code.strip())
                
            if full_text:
                import re
                regex_codes = re.findall(r'[A-Za-z0-9\-\+\[\]\_]{2,30}', full_text)
                potential_codes.extend(regex_codes)
                potential_codes.extend([word for word in full_text.split() if 2 <= len(word) <= 30])
                
            potential_codes = list(set(potential_codes))
            
            if potential_codes:
                from django.db.models import Q
                import operator
                from functools import reduce
                q_objects = [Q(client_code__iexact=code) for code in potential_codes]
                if q_objects:
                    matched_client = ClientProfile.objects.filter(reduce(operator.or_, q_objects)).first()
            
            # 2. Поиск описания товара
            if not extracted_desc and full_text:
                import re
                desc_parts = re.findall(r'【.*?】[^【\s]*', full_text)
                if desc_parts:
                    extracted_desc = " ".join(desc_parts).strip()
                else:
                    qty_match = re.search(r'(\d+)\s*件', full_text)
                    if qty_match:
                        extracted_desc = f"Товары: {qty_match.group(1)} шт."

            if extracted_desc and isinstance(extracted_desc, str):
                if len(extracted_desc) > 250:
                    extracted_desc = extracted_desc[:245] + "..."
            else:
                extracted_desc = ""

            # 3. Поиск трек-кода
            if not extracted_track and full_text:
                import re
                track_match = re.search(r'(JT\d{12,18}|YT\d{12,18}|ZTO\d{12,18}|SF\d{10,18}|\d{12,20})', full_text, re.IGNORECASE)
                if track_match:
                    extracted_track = track_match.group(1).upper()
                    logger.info(f"🎯 Gemini нашел трек-код через Regex: {extracted_track}")
                    
            if extracted_track and isinstance(extracted_track, str):
                extracted_track = extracted_track.strip()
            else:
                extracted_track = None

            return {
                "client": matched_client,
                "raw_client_code": extracted_client_code,
                "description": extracted_desc,
                "track_code": extracted_track
            }
        else:
            logger.error(f"❌ Ошибка Gemini API: {resp.status_code} - {resp.text}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Ошибка ИИ (Gemini Vision): {e}", exc_info=True)
        return None
    finally:
        # Возвращаем курсор файла на место для сохранения картинки в БД
        if hasattr(photo_file, 'seek'):
            photo_file.seek(0)

# ==========================================
# 0. НАСТРОЙКА ПАГИНАЦИИ 
# ==========================================
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50                  
    page_size_query_param = 'page_size'
    max_page_size = 1000            

# ==========================================
# 1. КЛИЕНТСКАЯ ЧАСТЬ
# ==========================================

class ClientAddPackageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        track_code = request.data.get('track_code')
        description = request.data.get('description', '')

        if not track_code:
            return Response({"error": "Трек-код обязателен!"}, status=status.HTTP_400_BAD_REQUEST)

        client_profile = request.user.clientprofile
        package = Package.objects.filter(track_code=track_code).first()

        if package:
            if package.client != client_profile and package.client.client_code != "UNKNOWN":
                return Response({"error": "Этот трек-код уже зарегистрирован другим пользователем."}, status=status.HTTP_400_BAD_REQUEST)
            if package.client == client_profile:
                return Response({"error": "Вы уже добавили этот трек-код."}, status=status.HTTP_400_BAD_REQUEST)

            if package.client.client_code == "UNKNOWN":
                package.client = client_profile
                if description:
                    package.description = description
                package.save()
                PackageHistory.objects.create(package=package, status=package.status, location='Клиент привязал трек-код')
                return Response(PackageSerializer(package).data, status=status.HTTP_200_OK)

        try:
            new_package = Package.objects.create(
                client=client_profile, track_code=track_code, description=description,
                status='expected', weight=Decimal('0.00'), total_price=Decimal('0.00')
            )
            PackageHistory.objects.create(package=new_package, status='expected', location='Ожидается на складе')
            return Response(PackageSerializer(new_package).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ClientPackagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_code):
        if not request.user.is_staff:
            if not hasattr(request.user, 'clientprofile') or request.user.clientprofile.client_code != client_code:
                return Response({"error": "Доступ запрещен!"}, status=status.HTTP_403_FORBIDDEN)
        try:
            profile = ClientProfile.objects.get(client_code=client_code)
            packages = Package.objects.filter(client=profile).prefetch_related('history').order_by('-created_at')
            serializer = PackageSerializer(packages, many=True)
            return Response(serializer.data)
        except ClientProfile.DoesNotExist:
            return Response({"error": "Клиент не найден"}, status=status.HTTP_404_NOT_FOUND)


# ==========================================
# 2. СКЛАДСКАЯ ЧАСТЬ (АДМИН)
# ==========================================

class CreatePackageView(APIView):
    permission_classes = [IsEmployee]

    def post(self, request):
        client_code = request.data.get('client_code')
        track_code = request.data.get('track_code')
        description = request.data.get('description', '')
        photo = request.FILES.get('photo') or request.data.get('photo')
        
        weight_val = request.data.get('weight')
        try:
            if weight_val and str(weight_val).strip():
                weight = Decimal(str(weight_val).replace(',', '.').strip())
            else:
                weight = Decimal('0.00')
        except (ValueError, TypeError, InvalidOperation):
            return Response({"error": f"Неверный формат веса: {weight_val}"}, status=status.HTTP_400_BAD_REQUEST)

        if not track_code:
            return Response({"error": "Трек-код обязателен!"}, status=status.HTTP_400_BAD_REQUEST)
        
        ignore_prohibited = request.data.get('ignore_prohibited', 'false').lower() == 'true'
        force_status = request.data.get('force_status')
        
        # 👇 НОВАЯ ЛОГИКА: УМНЫЙ ПОИСК В БАЗЕ 👇
        existing_package = Package.objects.filter(track_code=track_code).first()
        if existing_package and existing_package.client:
            # Если трек-код уже есть в БД (клиент добавил сам), забираем его данные!
            if not client_code:
                client_code = existing_package.client.client_code
            
            # Если админ не ввел описание, берем то, которое оставил клиент (например, "Куртка")
            if not description and existing_package.description:
                description = existing_package.description
        
        # ==========================================
        # 🔥 МАГИЯ AI VISION: ИЩЕМ КЛИЕНТА И ОПИСАНИЕ
        # ==========================================
        ai_recognized = False
        
        # Если есть фото, и не хватает либо клиента, либо описания - просим ИИ помочь!
        if photo and (not client_code or not description):
            extracted_data = extract_client_from_photo(photo)
            
            if extracted_data:
                # 1. Авто-заполнение Клиента
                if not client_code:
                    if extracted_data.get("client"):
                        client_code = extracted_data["client"].client_code
                        ai_recognized = True
                    elif extracted_data.get("raw_client_code"):
                        client_code = extracted_data["raw_client_code"]
                        ai_recognized = True
                
                # 2. Авто-заполнение Описания товара
                if not description and extracted_data.get("description"):
                    description = extracted_data["description"]

        if not client_code:
             return Response({"error": "Код клиента обязателен! Введите его вручную или сделайте четкое фото этикетки."}, status=status.HTTP_400_BAD_REQUEST)

        # ПРОВЕРКА НА ЗАПРЕЩЕННЫЕ ТОВАРЫ
        if description and not ignore_prohibited and force_status != 'rejected':
            from ..models import ProhibitedItem
            prohibited_items = ProhibitedItem.objects.all()
            for p_item in prohibited_items:
                if p_item.keyword.lower() in description.lower():
                    return Response({
                        "error": "prohibited_detected",
                        "keyword": p_item.keyword,
                        "message": f"Внимание! Обнаружено запрещенное слово (по БД): '{p_item.keyword}'. Вы уверены, что хотите добавить этот товар?"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Проверка через ИИ (Gemini)
            import os, requests
            from ..models import ProhibitedItem
            api_key = os.getenv("GEMINI_API_KEY")
            if api_key:
                prohibited_items = list(ProhibitedItem.objects.values_list('keyword', flat=True))
                prohibited_list_str = ", ".join(prohibited_items) if prohibited_items else "лекарства, медикаменты, витамины, БАДы"

                prompt = (
                    f"Ты таможенный эксперт. Проверь товар '{description}'.\n"
                    f"Наш список строго запрещённых товаров и категорий: {prohibited_list_str}.\n"
                    f"Если '{description}' является одним из этих товаров, относится к их категории (например, если заказано лекарство, а в списке есть 'лекарства') "
                    f"или запрещен к перевозке по общим таможенным правилам, отвечай 'ДА'.\n"
                    f"В противном случае отвечай 'НЕТ'.\n"
                    f"Формат ответа:\n"
                    f"Первая строка: только слово 'ДА' или 'НЕТ'.\n"
                    f"Вторая строка: краткое логичное объяснение почему (1-2 предложения)."
                )
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
                try:
                    resp = requests.post(
                        url, 
                        json={"contents": [{"parts": [{"text": prompt}]}]},
                        headers={"Content-Type": "application/json"},
                        timeout=5
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        text_response = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        lines = text_response.strip().split('\n')
                        if lines and "ДА" in lines[0].upper():
                            explanation = "\n".join(lines[1:]).strip() if len(lines) > 1 else text_response
                            return Response({
                                "error": "prohibited_detected",
                                "keyword": "ИИ отклонил",
                                "message": f"ИИ счел товар '{description}' запрещенным!\n\nПричина: {explanation}\n\nВы уверены, что хотите добавить этот товар?"
                            }, status=status.HTTP_400_BAD_REQUEST)
                except Exception as e:
                    logger.error("Ошибка ИИ при проверке запрещенки: %s", e, exc_info=True)

        try:
            with transaction.atomic():
                client = None
                if client_code:
                    try:
                        client = ClientProfile.objects.get(client_code=client_code)
                    except ClientProfile.DoesNotExist:
                        # Клиент-код не найден — создаем новый профиль, чтобы он отображался на месте ID клиента
                        import uuid
                        import random
                        safe_username = f"auto_{uuid.uuid4().hex[:8]}"
                        new_user = User.objects.create(
                            username=safe_username,
                            first_name="Неизвестный (Авто)"
                        )
                        new_user.set_password("temp_password_123")
                        new_user.save()
                        
                        random_phone = f"000{random.randint(1000000, 9999999)}"
                        while ClientProfile.objects.filter(phone_number=random_phone).exists():
                            random_phone = f"000{random.randint(1000000, 9999999)}"
                            
                        client = ClientProfile.objects.create(
                            user=new_user,
                            client_code=client_code,
                            phone_number=random_phone,
                            role='client'
                        )

                package, created = Package.objects.get_or_create(
                    track_code=track_code,
                    defaults={
                        'client': client,
                        'status': force_status if force_status else 'china_warehouse',
                        'description': description,
                        'weight': weight,
                        'photo': photo
                    }
                )

                history_status = force_status if force_status else 'china_warehouse'
                history_location = 'Запрещено' if force_status == 'rejected' else 'Гуанчжоу (Склад)'

                if not created:
                    if force_status:
                        package.status = force_status
                        history_status = force_status
                        history_location = 'Запрещено'
                    
                    # Если посылка была заранее добавлена клиентом (Ожидается),
                    # меняем статус сразу на "В пути"
                    if package.status == 'expected':
                        package.status = 'in_transit'
                        history_status = 'in_transit'
                        history_location = 'Отправлено в пути (Китай)'
                        
                        # 👇 НОВОЕ: Авто-уведомление клиенту 👇
                        if package.client and package.client.user:
                            msg_text = f"📦 Ваш товар ({package.track_code}) поступил на склад в Китае и уже отправлен в Душанбе!"
                            Notification.objects.create(recipient=package.client.user, text=msg_text)
                            Message.objects.create(sender=request.user, receiver=package.client.user, text=msg_text)
                            # Telegram-уведомление
                            if package.client.telegram_id:
                                send_telegram_notification(package.client.telegram_id, msg_text)
                        # 👆 ================================ 👆
                            
                    else:
                        package.status = 'china_warehouse'
                        
                    if weight > 0: package.weight = weight
                    if photo: package.photo = photo
                    if description: package.description = description
                    if not package.client and client: package.client = client
                    package.save()
                
                PackageHistory.objects.create(
                    package=package, status=history_status, 
                    location=history_location, changed_by=request.user
                )

            response_data = PackageSerializer(package).data
            response_data['ai_recognized'] = ai_recognized 
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": f"Ошибка сервера: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class UpdatePackageStatusView(APIView):
    permission_classes = [IsEmployee]

    def post(self, request):
        track_code = request.data.get('track_code')
        new_status = request.data.get('new_status')
        shelf_location = request.data.get('shelf_location')
        weight_val = request.data.get('weight')
        photo = request.FILES.get('photo') or request.data.get('photo')  
        client_code = request.data.get('client_code') 

        if not track_code or not new_status:
            return Response({"error": "Нет данных (трек или статус)!"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            package = Package.objects.get(track_code=track_code)
            old_status = package.status
            package.status = new_status
            
            if client_code:
                try:
                    package.client = ClientProfile.objects.get(client_code=client_code)
                except ClientProfile.DoesNotExist:
                    # Клиент-код не найден — создаем новый профиль
                    import uuid
                    import random
                    safe_username = f"auto_{uuid.uuid4().hex[:8]}"
                    new_user = User.objects.create(
                        username=safe_username,
                        first_name="Неизвестный (Авто)"
                    )
                    new_user.set_password("temp_password_123")
                    new_user.save()
                    
                    random_phone = f"000{random.randint(1000000, 9999999)}"
                    while ClientProfile.objects.filter(phone_number=random_phone).exists():
                        random_phone = f"000{random.randint(1000000, 9999999)}"
                        
                    package.client = ClientProfile.objects.create(
                        user=new_user,
                        client_code=client_code,
                        phone_number=random_phone,
                        role='client'
                    )

            if weight_val:
                try:
                    clean_weight = str(weight_val).replace(',', '.').strip()
                    if clean_weight: package.weight = Decimal(clean_weight)
                except (ValueError, TypeError, InvalidOperation):
                    return Response({"error": f"Неверный формат веса: {weight_val}"}, status=status.HTTP_400_BAD_REQUEST)

            if shelf_location is not None: package.shelf_location = shelf_location
            if photo: package.photo = photo

            if new_status == 'delivered':
                package.is_paid = True
                package.payment_date = timezone.now()

            package.save()

            if old_status != new_status or shelf_location or client_code:
                location_name = "Изменение данных"
                if new_status == 'arrived_dushanbe': location_name = "Душанбе (Склад)"
                elif new_status == 'delivered': location_name = "Душанбе (Выдано)"
                elif new_status == 'china_warehouse': location_name = "Гуанчжоу"
                
                if shelf_location and old_status == new_status:
                     location_name = f"Перемещено: {shelf_location}"

                PackageHistory.objects.create(
                    package=package, status=new_status, 
                    location=location_name, changed_by=request.user
                )

                # Телеграм-уведомления при смене статуса
                if old_status != new_status and package.client and package.client.telegram_id:
                    STATUS_MESSAGES = {
                        'in_transit':       f"\U0001f69b Ваша посылка <b>{package.track_code}</b> отправлена в путь.",
                        # arrived_dushanbe — НЕТ авто-уведомления. 2 дня фасовка. Рассылка вручную через Dashboard.
                        'ready_for_pickup': f"\U0001f4e6 Ваша посылка <b>{package.track_code}</b> готова к выдаче! Полка: {package.shelf_location or '—'}. \U0001f91d Приходите за ней.",
                        'delivered':        f"\u2705 Ваша посылка <b>{package.track_code}</b> выдана. Спасибо за доверие Kayhon Cargo! \U0001f60a",
                        'rejected':         f"\u274c Товар <b>{package.track_code}</b> отклонён. Свяжитесь с нами для уточнения.",
                    }
                    tg_text = STATUS_MESSAGES.get(new_status)
                    if tg_text:
                        send_telegram_notification(package.client.telegram_id, tg_text)

            return Response(PackageSerializer(package).data, status=status.HTTP_200_OK)

        except Package.DoesNotExist:
            return Response({"error": "Посылка не найдена!"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"Ошибка: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class RecognizeClientView(APIView):
    permission_classes = [IsEmployee]

    def post(self, request, *args, **kwargs):
        photo = request.FILES.get('photo')
        if not photo:
            return Response({"error": "Фото не предоставлено"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            extracted_data = extract_client_from_photo(photo)
            
            client_code = None
            track_code = None # <--- Добавили
            
            if extracted_data:
                if extracted_data.get("client"):
                    client_code = extracted_data["client"].client_code
                elif extracted_data.get("raw_client_code"):
                    client_code = extracted_data["raw_client_code"]
                track_code = extracted_data.get("track_code") # <--- Забираем трек-код
                
            return Response({
                "client_code": client_code, 
                "track_code": track_code # <--- Отправляем на фронт
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PackageDeleteView(APIView):
    permission_classes = [IsAdminOrManager]

    def delete(self, request, pk):
        package = get_object_or_404(Package, pk=pk)
        track = package.track_code
        package.delete()
        return Response({"message": f"Посылка {track} удалена"}, status=status.HTTP_200_OK)


class BulkUpdateStatusView(APIView):
    permission_classes = [IsEmployee]

    def post(self, request):
        file = request.FILES.get('file')
        new_status = request.data.get('new_status')

        if not file or not new_status:
            return Response({"error": "Файл и статус обязательны"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(file)
            sheet = wb.active
            
            track_codes_from_excel = set()
            for row in sheet.iter_rows(min_row=2, max_col=1, values_only=True):
                track_code = str(row[0]).strip() if row[0] else ""
                if track_code and track_code != 'None':
                    track_codes_from_excel.add(track_code)

            if not track_codes_from_excel:
                return Response({"error": "В файле не найдено ни одного трек-кода"}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                found_packages = list(Package.objects.filter(track_code__in=track_codes_from_excel))
                found_track_codes = {pkg.track_code for pkg in found_packages}
                not_found_tracks = list(track_codes_from_excel - found_track_codes)
                history_records = []
                
                
                notifications = [] # <--- ДОБАВИТЬ ПЕРЕД ЦИКЛОМ FOR
                messages_to_create = [] # <--- ДОБАВИТЬ ПЕРЕД ЦИКЛОМ FOR
                for pkg in found_packages:
                    actual_new_status = new_status
                    actual_location = "Массовое обновление (Excel)"
                    
                    if pkg.status == 'expected' and new_status in ['china_warehouse', 'in_transit']:
                        actual_new_status = 'in_transit'
                        actual_location = "Отправлено в пути (Китай)"
                        
                        if pkg.client and pkg.client.user:
                            msg_text = f"📦 Ваш товар ({pkg.track_code}) поступил на склад в Китае и отправлен в Душанбе!"
                            notifications.append(Notification(recipient=pkg.client.user, text=msg_text))
                            messages_to_create.append(Message(sender=request.user, receiver=pkg.client.user, text=msg_text))
                            # Telegram-уведомление
                            if pkg.client.telegram_id:
                                send_telegram_notification(pkg.client.telegram_id, msg_text)
                        
                    pkg.status = actual_new_status
                    history_records.append(PackageHistory(package=pkg, status=actual_new_status, location=actual_location, changed_by=request.user))
                if notifications:
                    Notification.objects.bulk_create(notifications)
                if messages_to_create:
                    Message.objects.bulk_create(messages_to_create)

                if found_packages:
                    Package.objects.bulk_update(found_packages, ['status'])
                
                new_packages_created = 0
                if not_found_tracks:
                    unknown_user, _ = User.objects.get_or_create(username="unknown_cargo", defaults={'first_name': "Неизвестный", 'password': "temp_password_123"})
                    unknown_client, _ = ClientProfile.objects.get_or_create(phone_number="000000000", defaults={'user': unknown_user, 'client_code': "UNKNOWN", 'role': "client"})

                    new_packages = []
                    for track in not_found_tracks:
                        new_packages.append(Package(track_code=track, client=unknown_client, status=new_status, description="Добавлено из Excel (Без владельца)"))
                    
                    created_pkgs = Package.objects.bulk_create(new_packages)
                    new_packages_created = len(created_pkgs)
                    
                    for pkg in created_pkgs:
                        history_records.append(PackageHistory(package=pkg, status=new_status, location="Массовое добавление (Excel)", changed_by=request.user))

                if history_records:
                    PackageHistory.objects.bulk_create(history_records)

            return Response({
                "message": f"Успешно обновлено: {len(found_packages)}. Создано новых (Неизвестных): {new_packages_created}",
                "not_found": not_found_tracks
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Ошибка обработки файла: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class ClientReadyPackagesView(APIView):
    permission_classes = [IsEmployee]

    def get(self, request, client_code):
        try:
            profile = ClientProfile.objects.get(client_code=client_code)
            packages = Package.objects.filter(client=profile, status='arrived_dushanbe').order_by('shelf_location')
            serializer = PackageSerializer(packages, many=True)
            total_sum = sum(pkg.total_price for pkg in packages)
            total_weight = sum(pkg.weight for pkg in packages)
            
            return Response({
                "client": {"full_name": profile.user.first_name, "phone": profile.phone_number},
                "packages": serializer.data,
                "summary": {"total_money": total_sum, "total_weight": total_weight, "count": packages.count()}
            })
        except ClientProfile.DoesNotExist:
            return Response({"error": "Клиент не найден"}, status=status.HTTP_404_NOT_FOUND)


class DeliverAllPackagesView(APIView):
    permission_classes = [IsEmployee]

    def post(self, request):
        client_code = request.data.get('client_code')
        package_ids = request.data.get('package_ids', []) # массив ID посылок
        
        if not client_code: 
            return Response({"error": "Нужен код клиента"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                profile = ClientProfile.objects.get(client_code=client_code)
                
                # Фильтруем посылки клиента, которые готовы к выдаче
                from django.db.models import Q
                packages = Package.objects.filter(
                    client=profile
                ).filter(
                    Q(status='arrived_dushanbe') | Q(status='ready_for_pickup')
                )
                
                # Если передали конкретные ID — выдаем только их
                if package_ids:
                    packages = packages.filter(id__in=package_ids)
                
                if not packages.exists(): 
                    return Response({"error": "Нет посылок к выдаче (или они уже выданы)"}, status=status.HTTP_400_BAD_REQUEST)
                
                count = packages.count()
                updated_ids = []
                
                for pkg in packages:
                    pkg.status = 'delivered'
                    pkg.is_paid = True
                    pkg.payment_date = timezone.now()
                    pkg.save()
                    PackageHistory.objects.create(package=pkg, status='delivered', location='Душанбе (Выдано)', changed_by=request.user)
                    updated_ids.append(pkg.id)

                return Response({"message": f"Выдано посылок: {count}", "ids": updated_ids}, status=status.HTTP_200_OK)

            except ClientProfile.DoesNotExist:
                return Response({"error": "Клиент не найден"}, status=status.HTTP_404_NOT_FOUND)


class PackageListView(generics.ListAPIView):
    queryset = Package.objects.select_related('client', 'client__user').prefetch_related('history').order_by('-created_at')
    serializer_class = PackageSerializer
    permission_classes = [IsEmployee]
    pagination_class = StandardResultsSetPagination 
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'is_paid'] 
    search_fields = ['track_code', 'description', 'client__client_code', 'client__phone_number', 'shelf_location']
    
class TrackPackagePublicView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, track_code):
        try:
            package = Package.objects.get(track_code__iexact=track_code.strip())
            history_data = [{"status_display": dict(Package.STATUS_CHOICES).get(h.status, h.status), "location": h.location, "created_at": h.created_at} for h in package.history.all()]
            return Response({
                "track_code": package.track_code, "status": package.status,
                "status_display": dict(Package.STATUS_CHOICES).get(package.status, package.status),
                "weight": package.weight, "history": history_data
            }, status=status.HTTP_200_OK)
        except Package.DoesNotExist:
            return Response({"error": "Посылка не найдена"}, status=status.HTTP_404_NOT_FOUND)