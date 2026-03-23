# backend/logistics/views/__init__.py

from .auth import RegisterView, LoginView
from .packages import (
    CreatePackageView, 
    UpdatePackageStatusView, 
    ClientPackagesView, 
    PackageListView,
    ClientAddPackageView, 
    ClientReadyPackagesView,
    DeliverAllPackagesView,
    BulkUpdateStatusView
)
from .clients import ClientListView, ClientDetailView
from .dashboard import AdminDashboardView, NotificationView
from .applications import ApplicationView

# --- ДОБАВЬ ЭТУ СТРОКУ ---
from .search import GlobalSearchView
from .messenger import ChatMessageView, AdminChatListView