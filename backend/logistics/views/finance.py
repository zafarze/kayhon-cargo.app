from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from django.shortcuts import get_object_or_404
from ..models import Expense
from ..serializers import ExpenseSerializer

class ExpenseListView(APIView):
    """
    CRUD для расходов
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        expenses = Expense.objects.all().order_by('-date')
        serializer = ExpenseSerializer(expenses, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ExpenseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ExpenseDetailView(APIView):
    permission_classes = [IsAdminUser]
    
    def delete(self, request, pk):
        expense = get_object_or_404(Expense, pk=pk)
        expense.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
