from django.urls import path
from .views import (
    RegisterView, 
    LoginView, 
    ClientPackagesView, 
    AdminDashboardView, 
    CreatePackageView, 
    ClientAddPackageView, 
    ClientListView,
    ClientDetailView,
    UpdatePackageStatusView, 
    ApplicationView, 
    NotificationView,
    PackageListView,
    ClientReadyPackagesView,
    DeliverAllPackagesView,
    BulkUpdateStatusView,
    GlobalSearchView,
)
from .views.packages import PackageDeleteView, TrackPackagePublicView
from .views.dashboard import AdminDashboardView, NotificationView, BroadcastNotificationView

# Импортируем контроллеры профиля
from .views.auth import UserMeView, ChangePasswordView, SystemUsersView, CreateEmployeeView, EmployeeDetailView, TelegramAuthView

# --- ДОБАВЛЯЕМ ИМПОРТ НАШЕГО СКАНЕРА ---
from .views.scanner import ClientScanView
from .views.packages import PackageDeleteView
from .views.deliveries import request_delivery, list_deliveries, update_delivery_status
from .views.messenger import ChatMessageView, AdminChatListView
from .views.prohibited import ProhibitedItemListView, ProhibitedItemDetailView, CheckItemAIView, AllowedDeclarationsView
from .views.reports import ReportExportView
from .views.finance import ExpenseListView, ExpenseDetailView
from .views.push import PushSubscribeView, PushUnsubscribeView, VapidPublicKeyView, SendTestPushView

urlpatterns = [
    # --- Авторизация ---
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('auth/telegram/', TelegramAuthView.as_view(), name='auth-telegram'),
    path('auth/me/', UserMeView.as_view(), name='user-me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # --- Сотрудники ---
    path('auth/users/', SystemUsersView.as_view(), name='system-users'),
    path('auth/users/create/', CreateEmployeeView.as_view(), name='create-employee'),
    path('auth/users/<int:pk>/', EmployeeDetailView.as_view(), name='employee-detail'),
    
    # --- Клиенты ---
    path('clients/', ClientListView.as_view(), name='clients-list'),
    path('clients/<int:pk>/', ClientDetailView.as_view(), name='client-detail'),
    
    # --- СКАНЕР КЛИЕНТА (НОВЫЙ ПУТЬ) ---
    path('scan/client/', ClientScanView.as_view(), name='scan-client'),
    
    # --- Посылки (Сначала специфичные пути) ---
    path('packages/all/', PackageListView.as_view(), name='all-packages'),
    path('packages/create/', CreatePackageView.as_view(), name='create-package'),
    path('packages/add/', ClientAddPackageView.as_view(), name='client-add-package'),
    path('packages/update/', UpdatePackageStatusView.as_view(), name='update-package'),
    
    # Новые функции (Выдача и Excel)
    path('packages/deliver-all/', DeliverAllPackagesView.as_view(), name='deliver-all'),
    path('packages/bulk-update/', BulkUpdateStatusView.as_view(), name='bulk-update'),
    
    # Пути с параметрами (должны быть ниже статических)
    path('packages/ready/<str:client_code>/', ClientReadyPackagesView.as_view(), name='client-ready'),
    path('packages/<str:client_code>/', ClientPackagesView.as_view(), name='client-packages'),
    
    # --- Заявки ---
    path('applications/', ApplicationView.as_view(), name='applications'),

    # --- Дашборд ---
    path('admin-dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('notifications/', NotificationView.as_view(), name='notifications'),
    path('search/global/', GlobalSearchView.as_view(), name='global-search'),
    path('packages/<int:pk>/delete/', PackageDeleteView.as_view(), name='package-delete'),
    path('packages/track/<str:track_code>/', TrackPackagePublicView.as_view(), name='public-track'),
    path('notifications/broadcast/', BroadcastNotificationView.as_view(), name='broadcast'),

    # Доставка
    path('delivery/request/', request_delivery, name='delivery-request'),
    path('delivery/list/', list_deliveries, name='delivery-list'),
    path('delivery/<int:pk>/update/', update_delivery_status, name='delivery-update'),

    # Чат
    path('chat/', ChatMessageView.as_view(), name='chat-client'),
    path('chat/<str:client_code>/', ChatMessageView.as_view(), name='chat-admin-client'),
    path('chat-list/', AdminChatListView.as_view(), name='chat-admin-list'),

    # Запрещенные товары
    path('prohibited/check-ai/', CheckItemAIView.as_view(), name='check-item-ai'),
    path('prohibited/declarations/', AllowedDeclarationsView.as_view(), name='allowed-declarations'),
    path('prohibited/', ProhibitedItemListView.as_view(), name='prohibited-list'),
    path('prohibited/<int:pk>/', ProhibitedItemDetailView.as_view(), name='prohibited-detail'),

    # Отчеты
    path('reports/export/', ReportExportView.as_view(), name='report-export'),

    # Финансы / Расходы
    path('finance/expenses/', ExpenseListView.as_view(), name='finance-expenses-list'),
    path('finance/expenses/<int:pk>/', ExpenseDetailView.as_view(), name='finance-expenses-detail'),

    # Push-уведомления
    path('push/subscribe/', PushSubscribeView.as_view(), name='push-subscribe'),
    path('push/unsubscribe/', PushUnsubscribeView.as_view(), name='push-unsubscribe'),
    path('push/vapid-key/', VapidPublicKeyView.as_view(), name='push-vapid-key'),
    path('push/test/', SendTestPushView.as_view(), name='push-test'),
]
