// src/types/index.ts

// 1. Пользователь (обычно используется внутри профиля)
export interface IUser {
	id: number;
	username: string;
	first_name: string;
	email?: string;
}

// 2. Клиент (для таблицы клиентов)
// Исправлено: поля first_name и date_joined теперь на верхнем уровне, как в сериалайзере
export interface IClient {
	id: number;
	client_code: string;
	phone_number: string;
	address?: string | null;
	first_name: string;   // <--- БЫЛО: user.first_name
	date_joined: string;  // <--- БЫЛО: user.date_joined
	packages_count: number;
	last_login?: string | null;
}

// 3. История посылки (НОВОЕ)
export interface IPackageHistory {
	status: string;
	status_display: string;
	location: string;
	created_at: string;
}

// 4. Посылка (Главный интерфейс)
export interface IPackage {
	id: number;
	track_code: string;
	description: string;

	// Важно: Decimal c бэкенда приходит строкой для сохранения точности
	weight: string;        // <--- БЫЛО: number
	price_per_kg: string;  // <--- НОВОЕ
	total_price: string;

	status: 'china_warehouse' | 'in_transit' | 'arrived_dushanbe' | 'ready_for_pickup' | 'in_delivery' | 'delivered';
	status_display: string;
	shelf_location?: string;

	is_paid: boolean;
	payment_date?: string; // <--- НОВОЕ (null или дата)

	photo?: string; // URL фото
	created_at: string;
	updated_at: string;

	client?: any;
	client_info?: {
		client_code: string;
		first_name: string;
		phone_number: string;
	} | null;

	// Вложенная история (мы добавили prefetch_related на бэке)
	history: IPackageHistory[]; // <--- НОВОЕ
}

// 5. Заявка с сайта
export interface IApplication {
	id: number;
	full_name: string;
	phone_number: string;
	description: string;
	status: 'new' | 'contacted' | 'completed' | 'canceled';
	status_display?: string; // Обычно сериалайзер добавляет это поле
	created_at: string;
}

// 6. Статистика для Дашборда
export interface IStats {
	total_packages: number;
	in_transit: number;
	total_users: number;
	new_applications: number;
	new_deliveries: number;
	unknown_packages: number;
	total_money: number;
	total_weight: number;
	avg_price_per_kg: number;
	unpaid_debt: number;
	total_expenses: number;
	net_profit: number;
	revenue_by_date: Array<{ date: string; revenue: number; weight: number }>;
	top_clients: Array<{ client_code: string; first_name: string; revenue: number }>;
}

// 7. Ответ при Логине (НОВОЕ)
export interface AuthResponse {
	access: string;
	refresh: string;
	is_admin: boolean;
	client_code: string | null;
	first_name: string;
}

export type DeliveryStatus = 'pending' | 'accepted' | 'delivered' | 'cancelled';

export interface IProhibitedItem {
	id: number;
	keyword: string;
	created_at: string;
}

export interface IExpense {
	id?: number;
	title: string;
	amount: number;
	date?: string;
	description?: string;
}

export interface IDeliveryRequest {
	id: number;
	client: number;
	client_code: string;
	client_name: string;
	packages: number[];
	packages_details: IPackage[];
	courier: number | null;
	courier_name: string | null;
	address: string;
	phone: string;
	comment: string;
	status: DeliveryStatus;
	status_display: string;
	created_at: string;
	accepted_at: string | null;
	delivered_at: string | null;
	updated_at: string;
}
