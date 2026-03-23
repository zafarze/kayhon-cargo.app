// src/components/common/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
// 🔥 ИСПРАВЛЕНО: путь теперь выходит на два уровня вверх (../../)
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
	requireAdmin?: boolean;
}

const ProtectedRoute = ({ requireAdmin = false }: ProtectedRouteProps) => {
	const { isAuthenticated, user } = useAuthStore();

	// 1. Если вообще не авторизован -> выкидываем на форму входа
	if (!isAuthenticated) {
		return <Navigate to="/" replace />;
	}

	// 2. Если роут только для админа, а зашел обычный клиент -> выкидываем в его кабинет
	if (requireAdmin && !user?.is_admin) {
		return <Navigate to={`/dashboard/${user?.client_code}`} replace />;
	}

	// 3. Если роут для клиента, но зашел админ
	if (!requireAdmin && user?.is_admin) {
		// 🔥 ИСПРАВЛЕНО: редирект на правильный роут админки
		return <Navigate to="/admin" replace />;
	}

	// Если всё ок, рендерим вложенные роуты
	return <Outlet />;
};

export default ProtectedRoute;