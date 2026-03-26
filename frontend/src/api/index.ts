// src/api/index.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://kayhon-backend-538751744849.europe-west3.run.app';

export const api = axios.create({
	baseURL: API_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Интерсептор ЗАПРОСОВ (Добавляем токен перед отправкой)
api.interceptors.request.use(
	(config) => {
		// Берем токен из нашего Zustand хранилища
		const token = useAuthStore.getState().token;
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// Интерсептор ОТВЕТОВ (Ловим ошибки, например, если токен протух)
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			// Если сервер ответил 401 (Не авторизован) -> выкидываем из системы
			useAuthStore.getState().logout();
			window.location.href = '/'; // Редирект на главную
		}
		return Promise.reject(error);
	}
);