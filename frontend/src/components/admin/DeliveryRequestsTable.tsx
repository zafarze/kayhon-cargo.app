import { useEffect, useState } from 'react';
import { api } from '../../api';
import { IDeliveryRequest } from '../../types';
import { Truck, CheckCircle, Clock, XCircle, Search, MapPin, Phone, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { customConfirm } from '../../utils/customConfirm';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const DeliveryRequestsTable = () => {
	const [requests, setRequests] = useState<IDeliveryRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'delivered'>('all');
	const [deliveryPrice, setDeliveryPrice] = useState(15.0);

	useEffect(() => {
		api.get('/api/settings/').then(res => {
			if (res.data?.price_dushanbe_home) {
				setDeliveryPrice(res.data.price_dushanbe_home);
			}
		}).catch(console.error);
	}, []);

	const fetchRequests = async () => {
		try {
			const res = await api.get<IDeliveryRequest[]>('/api/delivery/list/');
			setRequests(res.data);
		} catch {
			toast.error('Ошибка загрузки заявок на доставку');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRequests();
	}, []);

	useAutoRefresh(() => {
		fetchRequests();
	}, 15000);

	const updateStatus = async (id: number, newStatus: string) => {
		try {
			await api.patch(`/api/delivery/${id}/update/`, { status: newStatus });
			toast.success('Статус обновлен');
			fetchRequests();
		} catch {
			toast.error('Ошибка обновления статуса');
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'pending': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold flex items-center gap-1"><Clock size={12} /> Ожидает</span>;
			case 'accepted': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1"><Truck size={12} /> В пути</span>;
			case 'delivered': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Доставлено</span>;
			case 'cancelled': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1"><XCircle size={12} /> Отменено</span>;
			default: return null;
		}
	};

	const filteredRequests = requests.filter(req => {
		const matchesFilter = filter === 'all' || req.status === filter;
		const matchesSearch =
			req.client_code.toLowerCase().includes(search.toLowerCase()) ||
			req.client_name.toLowerCase().includes(search.toLowerCase()) ||
			req.address.toLowerCase().includes(search.toLowerCase()) ||
			req.phone.includes(search);
		return matchesFilter && matchesSearch;
	});

	if (loading) return <div className="text-center py-10 text-slate-400 dark:text-slate-500">Загрузка...</div>;

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
					<input
						type="text"
						placeholder="Поиск по ID, имени, адресу или телефону..."
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
					<button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${filter === 'all' ? 'bg-slate-800 dark:bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Все</button>
					<button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500'}`}>Ожидают</button>
					<button onClick={() => setFilter('accepted')} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${filter === 'accepted' ? 'bg-blue-500 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>В пути</button>
					<button onClick={() => setFilter('delivered')} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${filter === 'delivered' ? 'bg-green-500 text-white' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'}`}>Доставлены</button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{filteredRequests.length === 0 ? (
					<div className="col-span-full text-center py-10 text-slate-400 dark:text-slate-500">Заявки не найдены</div>
				) : (
					filteredRequests.map(req => (
						<div key={req.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full transition-colors">
							<div className="flex justify-between items-start mb-4">
								<div>
									<div className="font-black text-lg text-slate-900 dark:text-white">{req.client_name}</div>
									<div className="text-sm font-bold text-slate-400 dark:text-slate-500">ID: {req.client_code}</div>
								</div>
								{getStatusBadge(req.status)}
							</div>

							<div className="space-y-3 mb-6 flex-1">
								<div className="grid grid-cols-2 gap-2 text-xs mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
									<div className="flex flex-col">
										<span className="text-slate-400 dark:text-slate-500 font-medium">Создано:</span>
										<span className="font-bold text-slate-700 dark:text-slate-300">{new Date(req.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
									</div>
									{req.accepted_at && (
										<div className="flex flex-col">
											<span className="text-slate-400 dark:text-slate-500 font-medium">Принято:</span>
											<span className="font-bold text-slate-700 dark:text-slate-300">{new Date(req.accepted_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
										</div>
									)}
									{req.delivered_at && (
										<div className="flex flex-col col-span-2">
											<span className="text-slate-400 dark:text-slate-500 font-medium">Доставлено:</span>
											<span className="font-bold text-slate-700 dark:text-slate-300">{new Date(req.delivered_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
										</div>
									)}
								</div>

								<div className="flex items-start gap-2 text-sm">
									<MapPin size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
									<span className="font-medium text-slate-700 dark:text-slate-300">{req.address}</span>
								</div>
								<div className="flex items-center gap-2 text-sm">
									<Phone size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
									<a href={`tel:${req.phone}`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">{req.phone}</a>
								</div>
								{req.comment && (
									<div className="flex items-start gap-2 text-sm bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-orange-800 dark:text-orange-300">
										<MessageSquare size={16} className="shrink-0 mt-0.5 opacity-50" />
										<span className="font-medium italic">{req.comment}</span>
									</div>
								)}

								<div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
									<div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Посылки ({req.packages_details.length}):</div>
									<div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
										{req.packages_details.map(pkg => (
											<div key={pkg.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
												<span className="font-bold font-mono text-slate-700 dark:text-slate-300">{pkg.track_code}</span>
												<span className="text-slate-500 dark:text-slate-400 font-medium">{pkg.weight} кг</span>
											</div>
										))}
									</div>
									<div className="mt-3 flex flex-col gap-1 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800">
										<div className="flex justify-between items-center">
											<span className="text-[10px] font-bold text-green-600 dark:text-green-500 uppercase">За посылки:</span>
											<span className="font-bold text-green-700 dark:text-green-400 text-xs">
												{req.packages_details.reduce((sum, p) => sum + Number(p.total_price), 0).toFixed(2)} с.
											</span>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-[10px] font-bold text-green-600 dark:text-green-500 uppercase">Доставка:</span>
											<span className="font-bold text-green-700 dark:text-green-400 text-xs">
												{deliveryPrice.toFixed(2)} с.
											</span>
										</div>
										<div className="h-px w-full bg-green-200 dark:bg-green-800/50 my-1"></div>
										<div className="flex justify-between items-center">
											<span className="text-xs font-black text-green-800 dark:text-green-300 uppercase">К оплате:</span>
											<span className="font-black text-green-700 dark:text-green-400 text-base">
												{(req.packages_details.reduce((sum, p) => sum + Number(p.total_price), 0) + deliveryPrice).toFixed(2)} с.
											</span>
										</div>
									</div>
								</div>
							</div>

							<div className="flex gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
								{req.status === 'pending' && (
									<button
										onClick={() => updateStatus(req.id, 'accepted')}
										className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl transition-colors"
									>
										Принять
									</button>
								)}
								{req.status === 'accepted' && (
									<button
										onClick={() => updateStatus(req.id, 'delivered')}
										className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl transition-colors flex justify-center items-center gap-2"
									>
										<CheckCircle size={18} />
										Вручено
									</button>
								)}
								{(req.status === 'pending' || req.status === 'accepted') && (
									<button
										onClick={() => {
											customConfirm('Отменить заявку?', () => updateStatus(req.id, 'cancelled'));
										}}
										className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors"
									>
										Отмена
									</button>
								)}
								{req.status === 'delivered' && (
									<button
										onClick={() => {
											customConfirm('Вернуть в статус "В пути"?', () => updateStatus(req.id, 'accepted'));
										}}
										className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold py-2 rounded-xl transition-colors"
									>
										Отменить доставку
									</button>
								)}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};

export default DeliveryRequestsTable;