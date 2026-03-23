import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Package, Truck, Users, FileText, PackageX, Send } from 'lucide-react';
import { IClient, IPackage, IStats } from '../types';
import PackagesTable from './admin/PackagesTable';
import ClientsTable from './admin/ClientsTable';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const AdminDashboard = () => {
	const navigate = useNavigate();

	// Типизированный стейт
	const [stats, setStats] = useState<IStats | null>(null);
	const [recentPackages, setRecentPackages] = useState<IPackage[]>([]);
	const [recentClients, setRecentClients] = useState<IClient[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchData = async () => {
		try {
			const [dashboardRes, clientsRes] = await Promise.all([
				api.get('/api/admin-dashboard/'),
				api.get('/api/clients/?page_size=5') // Берем только 5 последних
			]);

			setStats(dashboardRes.data.stats);
			setRecentPackages(dashboardRes.data.recent_packages);

			// Обработка пагинации
			const cData = clientsRes.data.results ? clientsRes.data.results : clientsRes.data;
			setRecentClients(cData);

			setLoading(false);
		} catch (err) {
			console.error("Ошибка при загрузке данных:", err);
		}
	};

	useEffect(() => { fetchData(); }, []);
	useAutoRefresh(fetchData, 10000); // 10s

	if (loading) return (
		<div className="h-full flex items-center justify-center">
			<div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
		</div>
	);

	return (
		<div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-10">
			{/* КАРТОЧКИ СТАТИСТИКИ */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
				<StatCard
					title="Всего посылок"
					value={stats?.total_packages}
					icon={<Package className="text-white" />}
					color="bg-blue-500"
					shadow="shadow-blue-200"
					onClick={() => navigate('/admin/packages')}
				/>
				<StatCard
					title="В пути"
					value={stats?.in_transit}
					icon={<Truck className="text-white" />}
					color="bg-orange-500"
					shadow="shadow-orange-200"
					onClick={() => navigate('/admin/packages?filter=in_transit')}
				/>
				<StatCard
					title="Клиентов"
					value={stats?.total_users}
					icon={<Users className="text-white" />}
					color="bg-purple-500"
					shadow="shadow-purple-200"
					onClick={() => navigate('/admin/clients')}
				/>
				<StatCard
					title="Доставка"
					value={stats?.new_deliveries || 0}
					icon={<Send className="text-white" />}
					color="bg-yellow-500"
					shadow="shadow-yellow-200"
					onClick={() => navigate('/admin/delivery')}
				/>
				<StatCard
					title="Неизвестные"
					value={stats?.unknown_packages || 0}
					icon={<PackageX className="text-white" />}
					color="bg-red-500"
					shadow="shadow-red-200"
					onClick={() => navigate('/admin/packages?filter=unknown')}
				/>
			</div>

			{/* ТАБЛИЦЫ ОБЗОРА */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
				<div className="xl:col-span-2">
					<PackagesTable packages={recentPackages} isDashboard={true} />
				</div>
				<div className="xl:col-span-1 hidden xl:block">
					<ClientsTable clients={recentClients} />
				</div>
			</div>
		</div>
	);

	// Вспомогательный компонент карточки
	const StatCard = ({ title, value, icon, color, shadow, onClick }: any) => (
		<div
			className={`bg-white p-5 md:p-6 rounded-[2rem] shadow-xl shadow-gray-100 border border-gray-100 flex items-center gap-4 md:gap-5 hover:translate-y-[-5px] transition-transform duration-300 ${onClick ? 'cursor-pointer' : ''}`}
			onClick={onClick}
		>
			<div className={`w-12 h-12 md:w-16 md:h-16 ${color} rounded-2xl flex items-center justify-center shadow-lg ${shadow} shrink-0`}>
				{icon}
			</div>
			<div>
				<div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</div>
				<div className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">{value || 0}</div>
			</div>
		</div >
	);

	export default AdminDashboard;