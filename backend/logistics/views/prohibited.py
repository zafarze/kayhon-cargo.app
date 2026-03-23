import os
import requests
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import IsAdminUser
from ..models import ProhibitedItem
from ..serializers import ProhibitedItemSerializer

class CheckItemAIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        item_name = request.data.get("item_name", "").strip()
        if not item_name:
            return Response({"error": "Укажите название товара для проверки"}, status=status.HTTP_400_BAD_REQUEST)

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return Response({"error": "API ключ ИИ не настроен на сервере"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        prohibited_items = list(ProhibitedItem.objects.values_list('keyword', flat=True))
        prohibited_list_str = ", ".join(prohibited_items) if prohibited_items else "лекарства, медикаменты, витамины, БАДы"

        prompt = (
            f"Ты таможенный эксперт. Проверь товар '{item_name}'.\n"
            f"Наш список строго запрещённых товаров и категорий: {prohibited_list_str}.\n"
            f"Если '{item_name}' является одним из этих товаров, относится к их категории (например, Нурофен - это лекарство, значит запрещено) "
            f"или запрещен к перевозке по общим таможенным правилам, отвечай 'ДА'.\n"
            f"В противном случае отвечай 'НЕТ'.\n"
            f"Формат ответа:\n"
            f"Первая строка: только слово 'ДА' или 'НЕТ'.\n"
            f"Вторая строка: краткое логичное объяснение почему (1-2 предложения)."
        )

        # Currently the most stable and available model for free tier
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        headers = {"Content-Type": "application/json"}

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                text_response = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                
                lines = text_response.strip().split('\n')
                is_prohibited = "ДА" in lines[0].upper()
                explanation = "\n".join(lines[1:]).strip() if len(lines) > 1 else text_response
                
                return Response({
                    "is_prohibited": is_prohibited,
                    "explanation": explanation
                })
            else:
                return Response({"error": f"Ошибка от AI: {resp.text}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProhibitedItemListView(generics.ListCreateAPIView):
    queryset = ProhibitedItem.objects.all().order_by('-created_at')
    serializer_class = ProhibitedItemSerializer
    permission_classes = [IsAdminUser]

class ProhibitedItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ProhibitedItem.objects.all()
    serializer_class = ProhibitedItemSerializer
    permission_classes = [IsAdminUser]

class AllowedDeclarationsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        from ..models import Package, CustomDeclaration
        from collections import Counter

        descriptions = Package.objects.exclude(description__isnull=True).exclude(description__exact='').values_list('description', flat=True)
        prohibited_keywords = list(ProhibitedItem.objects.values_list('keyword', flat=True))

        counts = Counter()
        for desc in descriptions:
            desc_lower = desc.strip().lower()
            if not desc_lower:
                continue
            is_prohibited = any(kw.lower() in desc_lower for kw in prohibited_keywords)
            if not is_prohibited:
                clean_desc = desc.strip().capitalize()
                counts[clean_desc] += 1
                
        customs = {c.original_name: c for c in CustomDeclaration.objects.all()}
        
        result = []
        for name, count in sorted(counts.items(), key=lambda x: x[0]):
            custom = customs.get(name)
            if custom and custom.is_deleted:
                continue
            display_name = custom.display_name if custom else name
            
            result.append({
                "original_name": name,
                "display_name": display_name,
                "count": count
            })
            
        return Response({
            "declarations": result
        })

    def put(self, request, *args, **kwargs):
        from ..models import CustomDeclaration
        original_name = request.data.get("original_name")
        display_name = request.data.get("display_name")
        
        if not original_name or not display_name:
            return Response({"error": "original_name and display_name are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        custom, created = CustomDeclaration.objects.get_or_create(
            original_name=original_name,
            defaults={"display_name": display_name}
        )
        if not created:
            custom.display_name = display_name
            custom.save()
            
        return Response({"message": "Updated successfully"})

    def delete(self, request, *args, **kwargs):
        from ..models import CustomDeclaration
        original_name = request.data.get("original_name")
        if not original_name:
            return Response({"error": "original_name is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        custom, created = CustomDeclaration.objects.get_or_create(
            original_name=original_name,
            defaults={"display_name": original_name, "is_deleted": True}
        )
        if not created:
            custom.is_deleted = True
            custom.save()
            
        return Response({"message": "Deleted successfully"})
