from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser # <--- ИМПОРТИРУЕМ ОБЕ

from ..models import Application
from ..serializers import ApplicationSerializer

class ApplicationView(APIView):
    
    # --- ДИНАМИЧЕСКИЕ ПРАВА ---
    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()] # Создавать заявку могут все (с сайта)
        return [IsAdminUser()]  # Читать и обновлять - только админ

    def get(self, request):
        apps = Application.objects.all().order_by('-created_at')
        serializer = ApplicationSerializer(apps, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ApplicationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        app_id = request.data.get('id')
        new_status = request.data.get('status')
        try:
            application = Application.objects.get(id=app_id)
            application.status = new_status
            application.save()
            return Response(status=status.HTTP_200_OK)
        except Application.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)