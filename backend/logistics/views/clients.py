from rest_framework import generics, filters
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import ClientProfile
from ..serializers import ClientListSerializer

# Используем ListAPIView - он уже умеет делить на страницы!
class ClientListView(generics.ListAPIView):
    # Исключаем сотрудников (is_staff=True) из списка клиентов
    queryset = ClientProfile.objects.filter(user__is_staff=False).select_related('user').order_by('-id')
    serializer_class = ClientListSerializer
    permission_classes = [IsAdminUser] # Только админ видит список
    
    # Подключаем поиск и фильтры
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    
    # По каким полям можно ИСКАТЬ (Search)
    search_fields = ['client_code', 'phone_number', 'user__first_name', 'user__last_name']

class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ClientProfile.objects.all()
    serializer_class = ClientListSerializer
    permission_classes = [IsAdminUser]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Обновляем имя пользователя если оно передано
        first_name = request.data.get('first_name')
        if first_name is not None:
            instance.user.first_name = first_name
            instance.user.save()
            
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)
