// src/store/authStore.ts
import { create } from 'zustand';

interface User {
	id: number;
	client_code: string;
	first_name: string;
	is_admin: boolean;
}

interface AuthState {
	token: string | null;
	user: User | null;
	isAuthenticated: boolean;
	login: (token: string, userData: any) => void;
	logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
	// 1. При запуске проверяем, есть ли сохраненный токен в браузере
	const savedToken = localStorage.getItem('accessToken');
	const savedUser = localStorage.getItem('userData');

	return {
		token: savedToken || null,
		user: savedUser ? JSON.parse(savedUser) : null,
		isAuthenticated: !!savedToken, // Если токен есть -> мы авторизованы

		// 2. Функция входа (сохраняем данные)
		login: (token, userData) => {
			localStorage.setItem('accessToken', token);
			localStorage.setItem('userData', JSON.stringify(userData));

			set({
				token: token,
				user: userData,
				isAuthenticated: true
			});
		},

		// 3. Функция выхода (чистим данные)
		logout: () => {
			localStorage.removeItem('accessToken');
			localStorage.removeItem('userData');

			set({
				token: null,
				user: null,
				isAuthenticated: false
			});
		}
	};
});