// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- ЛЕЙАУТЫ И ЗАЩИТА ---
import ProtectedRoute from './components/common/ProtectedRoute';
import ClientLayout from './components/layout/ClientLayout';
import AdminLayout from './components/layout/AdminLayout';

// --- СТРАНИЦЫ (AUTH) ---
// ТУТ ИСПРАВЛЕН ИМПОРТ НА AuthPage
import AuthPage from './pages/auth/AuthPage';

// --- СТРАНИЦЫ (TELEGRAM) ---
import TelegramDashboard from './pages/telegram/TelegramDashboard';

// --- СТРАНИЦЫ (CLIENT) ---
import DashboardRouter from './pages/DashboardRouter';
import ClientProfilePage from './pages/client/ClientProfilePage';

// --- СТРАНИЦЫ (ADMIN) ---
import DashboardPage from './pages/admin/DashboardPage';
import SettingsPage from './pages/admin/SettingsPage';
import ClientsPage from './pages/admin/ClientsPage';
import ApplicationsPage from './pages/admin/ApplicationsPage';
import FinancePage from './pages/admin/FinancePage';
import PackagesPage from './pages/admin/PackagesPage';
import UsersPage from './pages/admin/UsersPage';
import DeliveryPage from './pages/admin/DeliveryPage';
import ChatPage from './pages/admin/ChatPage';
import ProhibitedItemsPage from './pages/admin/ProhibitedItemsPage';

function App() {
  return (
    <>
      {/* Глобальные уведомления */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{
          style: {
            borderRadius: '16px',
            background: '#1F2937',
            color: '#fff',
            fontWeight: 600,
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
          }
        }}
      />

      <Routes>
        {/* --- 1. ПУБЛИЧНЫЕ СТРАНИЦЫ --- */}
        {/* ТУТ ИСПРАВЛЕН КОМПОНЕНТ НА <AuthPage /> */}
        <Route path="/" element={<AuthPage />} />

        {/* --- 2. TELEGRAM MINI APP --- */}
        <Route path="/telegram/:clientCode" element={<TelegramDashboard />} />

        {/* --- 3. КЛИЕНТСКАЯ ЗОНА --- */}
        <Route element={<ProtectedRoute requireAdmin={false} />}>
          <Route element={<ClientLayout />}>
            <Route path="/dashboard/:clientCode" element={<DashboardRouter />} />
            <Route path="/dashboard/:clientCode/profile" element={<ClientProfilePage />} />
          </Route>
        </Route>

        {/* --- 4. АДМИН ПАНЕЛЬ --- */}
        <Route path="/admin" element={<ProtectedRoute requireAdmin={true} />}>
          <Route element={<AdminLayout />}>

            {/* Редирект /admin -> /admin/dashboard */}
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* Основные разделы */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="prohibited" element={<ProhibitedItemsPage />} />
            <Route path="profile" element={<Navigate to="settings" replace />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="delivery" element={<DeliveryPage />} />
            <Route path="chat" element={<ChatPage />} />

          </Route>
        </Route>


        {/* --- 404 (Перенаправление на главную) --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;