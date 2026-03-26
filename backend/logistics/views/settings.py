from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from logistics.models import CompanySettings

class CompanySettingsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cfg = CompanySettings.get()
        return Response({
            "price_china_dushanbe": float(cfg.price_china_dushanbe),
            "price_dushanbe_home": float(cfg.price_dushanbe_home),
            "kg_per_cube": float(cfg.kg_per_cube),
            "price_per_cube": float(cfg.price_per_cube),
            "phone_bokhtar": cfg.phone_bokhtar,
            "phone_qubodiyon": cfg.phone_qubodiyon,
            "warehouse_address_ru": cfg.warehouse_address_ru,
            "warehouse_address_china": cfg.warehouse_address_china,
            "tariff_text_ru": cfg.tariff_text_ru,
            "tariff_text_en": cfg.tariff_text_en,
            "tariff_text_tj": cfg.tariff_text_tj,
        })

    def patch(self, request):
        # Проверяем is_staff или роль (на случай, если у суперадмина роль client)
        has_admin_role = hasattr(request.user, 'clientprofile') and request.user.clientprofile.role in ['admin', 'manager']
        if not request.user.is_authenticated or not (request.user.is_staff or has_admin_role):
            return Response({"error": "Forbidden"}, status=403)
            
        cfg = CompanySettings.get()
        
        # Обновляем только разрешенные поля
        if 'price_china_dushanbe' in request.data:
            cfg.price_china_dushanbe = request.data['price_china_dushanbe']
        if 'price_dushanbe_home' in request.data:
            cfg.price_dushanbe_home = request.data['price_dushanbe_home']
        if 'kg_per_cube' in request.data:
            cfg.kg_per_cube = request.data['kg_per_cube']
        if 'price_per_cube' in request.data:
            cfg.price_per_cube = request.data['price_per_cube']
        if 'phone_bokhtar' in request.data:
            cfg.phone_bokhtar = request.data['phone_bokhtar']
        if 'phone_qubodiyon' in request.data:
            cfg.phone_qubodiyon = request.data['phone_qubodiyon']
        if 'warehouse_address_ru' in request.data:
            cfg.warehouse_address_ru = request.data['warehouse_address_ru']
        if 'warehouse_address_china' in request.data:
            cfg.warehouse_address_china = request.data['warehouse_address_china']
        if 'tariff_text_ru' in request.data:
            cfg.tariff_text_ru = request.data['tariff_text_ru']
        if 'tariff_text_en' in request.data:
            cfg.tariff_text_en = request.data['tariff_text_en']
        if 'tariff_text_tj' in request.data:
            cfg.tariff_text_tj = request.data['tariff_text_tj']
            
        cfg.save()
        return Response({"message": "Settings updated"})
