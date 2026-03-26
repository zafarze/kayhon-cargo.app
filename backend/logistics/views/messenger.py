from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from ..models import Message, ClientProfile
from django.contrib.auth.models import User
from rest_framework import serializers

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_name', 'sender_avatar', 'receiver', 'text', 'is_read', 'created_at']

    def get_sender_name(self, obj):
        return obj.sender.first_name if obj.sender.first_name else obj.sender.username
        
    def get_sender_avatar(self, obj):
        if hasattr(obj.sender, 'clientprofile') and obj.sender.clientprofile.avatar:
            return obj.sender.clientprofile.avatar.url
        return None

class ChatMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_code=None):
        user = request.user
        
        # Если клиент
        if not user.is_staff:
            # Отмечаем личные сообщения от админа как прочитанные
            Message.objects.filter(receiver=user, is_read=False).update(is_read=True)
            # Отмечаем общие рассылки (где receiver=None) как прочитанные, только те, что созданы после регистрации
            Message.objects.filter(
                receiver__isnull=True, 
                created_at__gte=user.date_joined
            ).exclude(sender=user).filter(is_read=False).update(is_read=True)
            
            # Получаем личные сообщения и общие рассылки, созданные после регистрации
            messages = Message.objects.filter(
                Q(sender=user) | 
                Q(receiver=user) | 
                (Q(receiver__isnull=True) & Q(created_at__gte=user.date_joined))
            ).order_by('created_at')
            serializer = MessageSerializer(messages, many=True)
            return Response(serializer.data)
        
        # Если админ
        if not client_code:
            # Получить последние сообщения от разных клиентов
            messages = Message.objects.all().order_by('-created_at')
            serializer = MessageSerializer(messages, many=True)
            return Response(serializer.data)
            
        try:
            client_profile = ClientProfile.objects.get(client_code=client_code)
            client_user = client_profile.user
            
            # Админ открыл чат с конкретным клиентом -> отмечаем сообщения этого клиента как прочитанные
            Message.objects.filter(sender=client_user, receiver=None, is_read=False).update(is_read=True)
            Message.objects.filter(sender=client_user, receiver=user, is_read=False).update(is_read=True)
            
            messages = Message.objects.filter(Q(sender=client_user) | Q(receiver=client_user)).order_by('created_at')
            serializer = MessageSerializer(messages, many=True)
            return Response(serializer.data)
        except ClientProfile.DoesNotExist:
            return Response({"error": "Клиент не найден"}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, client_code=None):
        user = request.user
        text = request.data.get('text')
        
        if not text:
            return Response({"error": "Пустое сообщение"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Если пишет клиент
        if not user.is_staff:
            message = Message.objects.create(
                sender=user,
                receiver=None, # Отправляем админу/всем админам
                text=text
            )
            serializer = MessageSerializer(message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        # Если пишет админ
        if not client_code:
            return Response({"error": "Не указан код клиента"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            client_profile = ClientProfile.objects.get(client_code=client_code)
            client_user = client_profile.user
            message = Message.objects.create(
                sender=user,
                receiver=client_user,
                text=text
            )
            
            # --- НОВОЕ: Отправка уведомления в Telegram ---
            if client_profile.telegram_id:
                try:
                    from ..telegram_notify import send_telegram_notification
                    notification_text = f"💬 *Новое сообщение от поддержки:*\n\n{text}\n\n_Нажмите на кнопку «Чат» в меню, чтобы ответить._"
                    send_telegram_notification(client_profile.telegram_id, notification_text)
                except Exception as e:
                    print(f"Ошибка отправки Telegram уведомления о сообщении: {e}")
            # -----------------------------------------------

            serializer = MessageSerializer(message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ClientProfile.DoesNotExist:
            return Response({"error": "Клиент не найден"}, status=status.HTTP_404_NOT_FOUND)

class AdminChatListView(APIView):
    """
    Возвращает список клиентов, с которыми есть переписка, 
    или просто список всех клиентов для начала чата.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not request.user.is_staff:
            return Response({"error": "Доступ запрещен"}, status=status.HTTP_403_FORBIDDEN)
            
        # Получаем всех клиентов, которые писали или которым писали
        client_ids = Message.objects.filter(receiver__isnull=True).values_list('sender_id', flat=True).distinct()
        client_ids_2 = Message.objects.filter(sender=request.user).values_list('receiver_id', flat=True).distinct()
        
        all_ids = set(list(client_ids) + list(client_ids_2))
        
        clients = ClientProfile.objects.filter(user_id__in=all_ids, role='client')
        
        result = []
        for client in clients:
            last_msg = Message.objects.filter(Q(sender=client.user) | Q(receiver=client.user)).order_by('-created_at').first()
            result.append({
                "client_code": client.client_code,
                "first_name": client.user.first_name,
                "phone": client.phone_number,
                "avatar": client.avatar.url if client.avatar else None,
                "last_message": last_msg.text if last_msg else "",
                "last_message_date": last_msg.created_at if last_msg else None,
                "unread_count": Message.objects.filter(sender=client.user, receiver=None, is_read=False).count()
            })
            
        # Сортируем по последнему сообщению
        result.sort(key=lambda x: x['last_message_date'] or '', reverse=True)
        return Response(result)