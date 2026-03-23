// src/api/packages.ts
import { api } from './index';
import { Package } from '../types';

// ==========================================
// 0. ТИПЫ И ИНТЕРФЕЙСЫ
// ==========================================

// Интерфейс для пагинации (Django Rest Framework)
// Бэкенд возвращает именно такую структуру, а не просто массив
export interface PaginatedResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

// Параметры для фильтрации и пагинации списка посылок
export interface GetPackagesParams {
	search?: string;
	status?: string;
	is_paid?: boolean | string;
	page?: number;        // Номер страницы
	page_size?: number;   // Количество элементов на странице
}

// ==========================================
// API МЕТОДЫ
// ==========================================

// --- 1. Получить все посылки (Для Админа) ---
// ТЕПЕРЬ ПОДДЕРЖИВАЕТ ПАГИНАЦИЮ ИЗ DJANGO!
export const getPackages = async (params?: GetPackagesParams) => {
	// Обрати внимание: ожидаем PaginatedResponse<Package>, а не Package[]
	const response = await api.get<PaginatedResponse<Package>>('/packages/all/', { params });
	return response.data;
};

// --- 2. Получить посылки клиента (Для Личного кабинета) ---
// Бэкенд (ClientPackagesView) отдает обычный массив без пагинации
export const getClientPackages = async (clientCode: string) => {
	const response = await api.get<Package[]>(`/packages/${clientCode}/`);
	return response.data;
};

// --- 3. Создать посылку (Китай) ---
export const createPackage = async (data: {
	client_code: string;
	track_code: string;
	description?: string;
	photo?: File; // Важно: тут принимаем файл
}) => {
	const formData = new FormData();
	formData.append('client_code', data.client_code);
	formData.append('track_code', data.track_code);

	if (data.description) formData.append('description', data.description);
	if (data.photo) formData.append('photo', data.photo);

	const response = await api.post<Package>('/packages/create/', formData, {
		headers: { 'Content-Type': 'multipart/form-data' }, // Обязательно для файлов
	});
	return response.data;
};

// --- 4. Обновить статус (Душанбе) ---
export const updatePackageStatus = async (data: {
	track_code: string;
	new_status: string;
	weight?: string | number; // Вес может измениться
	shelf_location?: string;
	photo?: File; // Новое фото при прибытии
}) => {
	const formData = new FormData();
	formData.append('track_code', data.track_code);
	formData.append('new_status', data.new_status);

	// Переводим данные в строку для FormData
	if (data.weight !== undefined) formData.append('weight', data.weight.toString());
	if (data.shelf_location) formData.append('shelf_location', data.shelf_location);
	if (data.photo) formData.append('photo', data.photo);

	const response = await api.post<Package>('/packages/update/', formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return response.data;
};