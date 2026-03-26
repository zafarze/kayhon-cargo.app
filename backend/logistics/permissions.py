from rest_framework.permissions import BasePermission

class IsAdminOrManager(BasePermission):
    """
    Разрешает доступ только пользователям с ролью 'admin' или 'manager'.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        try:
            return request.user.clientprofile.role in ['admin', 'manager']
        except Exception:
            return False

class IsEmployee(BasePermission):
    """
    Разрешает доступ всем сотрудникам: admin, manager, warehouse, courier.
    Обычным 'client' доступ закрыт.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        try:
            return request.user.clientprofile.role in ['admin', 'manager', 'warehouse', 'courier']
        except Exception:
            return False

class IsWarehouse(BasePermission):
    """
    Разрешает доступ 'admin', 'manager' и 'warehouse'.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        try:
            return request.user.clientprofile.role in ['admin', 'manager', 'warehouse']
        except Exception:
            return False
