# backend/logistics/views/search.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from ..models import Package, ClientProfile

class GlobalSearchView(APIView):
    """
    Глобальный поиск по системе (Посылки, Клиенты)
    URL: /api/search/global/?q=...
    """
    permission_classes = [IsAuthenticated] # Доступ для всех авторизованных сотрудников

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        
        # Минимальная длина запроса - 2 символа
        if len(query) < 2:
            return Response([])

        results = []

        # --- 1. ПОИСК ПО ПОСЫЛКАМ (Трек-код или Описание) ---
        packages = Package.objects.filter(
            Q(track_code__icontains=query) | 
            Q(description__icontains=query)
        ).select_related('client')

        for pkg in packages:
            # Получаем человекочитаемый статус
            status_label = dict(Package.STATUS_CHOICES).get(pkg.status, pkg.status)
            
            results.append({
                'type': 'package',
                'id': pkg.id,
                'title': pkg.track_code,
                'subtitle': pkg.description or "Нет описания",
                'status': status_label
            })

        # --- 2. ПОИСК ПО КЛИЕНТАМ (Код, Имя, Телефон) ---
        clients = ClientProfile.objects.filter(
            Q(client_code__icontains=query) |
            Q(phone_number__icontains=query) |
            Q(user__first_name__icontains=query) |
            Q(user__last_name__icontains=query)
        ).select_related('user')

        for client in clients:
            full_name = f"{client.user.first_name} {client.user.last_name}".strip() or "Без имени"
            
            results.append({
                'type': 'client',
                'id': client.id,
                'title': f"{full_name} ({client.client_code})",
                'subtitle': client.phone_number,
                'status': 'Клиент'
            })

        return Response(results)