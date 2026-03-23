from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from ..models import ClientProfile, Package
from ..serializers import PackageSerializer, ClientListSerializer

class ClientScanView(APIView):
    """
    Принимает QR-код клиента (например, 'CLIENT:ZAFA9248')
    ИЛИ просто client_code / номер телефона при ручном вводе.
    Возвращает клиента и список его посылок, готовых к выдаче.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        qr_data = request.data.get('qr_data', '').strip()

        if not qr_data:
            return Response({"error": "Код клиента не передан"}, status=status.HTTP_400_BAD_REQUEST)

        # Извлекаем client_code из QR-данных: принимаем оба формата
        # 1. QR-формат: "CLIENT:ZAFA9248"
        # 2. Ручной ввод: просто "ZAFA9248" или номер телефона
        if qr_data.upper().startswith("CLIENT:"):
            client_code = qr_data.split(":", 1)[1].strip()
        else:
            client_code = qr_data  # просто код или телефон

        # Ищем по client_code (или по номеру телефона как запасной вариант)
        client = ClientProfile.objects.filter(
            Q(client_code__iexact=client_code) |
            Q(phone_number__icontains=client_code)
        ).first()

        if not client:
            return Response(
                {"error": f"Клиент с кодом или номером «{client_code}» не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Посылки к выдаче: arrived_dushanbe ИЛИ ready_for_pickup
        ready_packages = Package.objects.filter(
            client=client
        ).filter(
            Q(status='arrived_dushanbe') | Q(status='ready_for_pickup')
        ).order_by('-updated_at')

        client_data = ClientListSerializer(client).data
        packages_data = PackageSerializer(ready_packages, many=True).data

        return Response({
            "client": client_data,
            "packages": packages_data,
            "count": len(packages_data)
        }, status=status.HTTP_200_OK)