import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
	Package, Truck, Users, FileText, AlertCircle,
	Loader, MapPin, CheckCircle2, Box, Send, ScanLine, Download, X, Calendar
} from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useTranslation } from 'react-i18next';

// Импортируем модалки
import ClientHandoverModal from '../../components/admin/ClientHandoverModal';
import ReadyPackagesModal from '../../components/admin/ReadyPackagesModal';
import BroadcastModal from '../../components/admin/BroadcastModal';
import ScannerTerminal from '../../components/admin/ScannerTerminal';
import ClientHistoryModal from '../../components/admin/ClientHistoryModal';

const DashboardPage = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [stats, setStats] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	const [activeTab, setActiveTab] = useState('in_transit');

	// Стейты для выдачи клиенту (Старая модалка)
	const [isClientScannerOpen, setIsClientScannerOpen] = useState(false);
	const [scanResult, setScanResult] = useState<any>(null);
	const [isResultModalOpen, setIsResultModalOpen] = useState(false);
	const [isScanningProcessing, setIsScanningProcessing] = useState(false);

	// Стейт для панели рассылки
	const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

	// Push-уведомления (автоматическая подписка)
	usePushNotifications();

	// Стейт для нового терминала приемки (Китай/Душанбе)
	const [isAutoScannerOpen, setIsAutoScannerOpen] = useState(false);

	// Стейт для модалки отчета
	const [isReportModalOpen, setIsReportModalOpen] = useState(false);

	// Стейт для истории клиента
	const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
	const [historyClientCode, setHistoryClientCode] = useState('');

	useEffect(() => {
		fetchStats();
	}, []);

	// Автоматическое обновление данных дашборда каждую минуту
	useAutoRefresh(fetchStats, 60000);

	async function fetchStats() {
		try {
			const res = await api.get('/api/admin-dashboard/');
			setStats(res.data);
		} catch (error) {
			console.error("Ошибка загрузки дашборда", error);
		} finally {
			setLoading(false);
		}
	};

	const handleOpenHistory = (code: string) => {
		setHistoryClientCode(code);
		setIsHistoryModalOpen(true);
	};

	const handleClientScan = async (qrData: string) => {
		setIsScanningProcessing(true);
		const toastId = toast.loading('Поиск посылок клиента...');
		try {
			const res = await api.post('/api/scan/client/', { qr_data: qrData });
			setScanResult(res.data);
			setIsClientScannerOpen(false);
			setTimeout(() => {
				setIsResultModalOpen(true);
				toast.dismiss(toastId);
			}, 300);
		} catch (error: any) {
			toast.error(error.response?.data?.error || 'Ошибка при поиске клиента', { id: toastId });
		} finally {
			setIsScanningProcessing(false);
		}
	};

	const handleCreateReport = () => {
		setIsReportModalOpen(true);
	};

	const handleBroadcast = () => {
		setIsBroadcastOpen(true);
	};

	if (loading) return <div className="flex h-[50vh] items-center justify-center text-gray-400 gap-2 font-bold"><Loader className="animate-spin" /> {t('common.loading', 'Загрузка данных...')}</div>;

	const filteredPackages = stats?.recent_packages?.filter((pkg: any) => {
		if (activeTab === 'in_transit') return ['expected', 'china_warehouse', 'in_transit'].includes(pkg.status);
		if (activeTab === 'warehouse') return ['arrived_dushanbe', 'ready_for_pickup'].includes(pkg.status);
		if (activeTab === 'delivered') return pkg.status === 'delivered';
		if (activeTab === 'unknown') return !pkg.client_info || !pkg.client_info.client_code || pkg.client_info.client_code.includes('temp');
		return true;
	}) || [];

	return (
		<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-10 pt-2 lg:pt-4">

			{/* --- СТАТИСТИКА: Адаптивная сетка --- */}
			<div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
				<StatBox title={t('dashboard.total', 'Всего')} value={stats?.stats?.total_packages || 0} icon={<Box size={20} />} bg="bg-blue-500" shadow="shadow-blue-500/30" onClick={() => navigate('/admin/packages')} />
				<StatBox title={t('dashboard.in_transit', 'В пути')} value={stats?.stats?.in_transit || 0} icon={<Truck size={20} />} bg="bg-orange-500" shadow="shadow-orange-500/30" onClick={() => navigate('/admin/packages?status=in_transit')} />
				<StatBox title={t('dashboard.clients', 'Клиентов')} value={stats?.stats?.total_users || 0} icon={<Users size={20} />} bg="bg-purple-500" shadow="shadow-purple-500/30" onClick={() => navigate('/admin/clients')} />
				<StatBox title={t('dashboard.delivery', 'Доставка')} value={stats?.stats?.new_deliveries || 0} icon={<Send size={20} />} bg="bg-yellow-400" shadow="shadow-yellow-400/30" onClick={() => navigate('/admin/delivery')} />
				<StatBox title={t('dashboard.unknown', 'Неизвестные')} value={stats?.stats?.unknown_packages || 0} icon={<Package size={20} />} bg="bg-red-500" shadow="shadow-red-500/30" className="col-span-2 lg:col-span-1" onClick={() => navigate('/admin/packages?status=unknown')} />
			</div>

			{/* --- ГЛАВНАЯ СЕТКА: flex-col-reverse переворачивает блоки на мобилке --- */}
			<div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-6">

				{/* ЛЕВАЯ ЧАСТЬ: ТАБЛИЦА (внизу на мобилке, слева на ПК) */}
				<div className="lg:col-span-2 space-y-6">
					{/* ВКЛАДКИ: Горизонтальный скролл */}
					<div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar">
						<TabButton active={activeTab === 'in_transit'} onClick={() => setActiveTab('in_transit')} icon={<Truck size={16} />} label={t('dashboard.in_transit', 'В пути')} />
						<TabButton active={activeTab === 'warehouse'} onClick={() => setActiveTab('warehouse')} icon={<MapPin size={16} />} label={t('dashboard.on_warehouse', 'На складе')} />
						<TabButton active={activeTab === 'delivered'} onClick={() => setActiveTab('delivered')} icon={<CheckCircle2 size={16} />} label={t('dashboard.delivered', 'Выданные')} />
						<TabButton active={activeTab === 'unknown'} onClick={() => setActiveTab('unknown')} icon={<AlertCircle size={16} />} label={t('dashboard.unknown', 'Неизвестные')} />
					</div>

					<div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 md:p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-50/50 dark:border-slate-800 transition-colors">
						<div className="flex items-center justify-between mb-4 md:mb-6 md:ml-2">
							<div className="flex items-center gap-3">
								<div className="text-blue-600 hidden md:block"><Package size={28} /></div>
								<h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-white transition-colors">{t('dashboard.recent_packages', 'Недавние посылки')}</h3>
							</div>
							<span className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-full transition-colors">
								{t('dashboard.found', 'Найдено')}: {filteredPackages.length}
							</span>
						</div>

						<div className="overflow-x-auto custom-scrollbar">
							<table className="w-full text-left border-collapse min-w-[600px]">
								<thead>
									<tr className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest font-black border-b border-gray-100 dark:border-slate-800">
										<th className="pb-4 pl-4">{t('dashboard.track_code', 'Трек-код')}</th>
										<th className="pb-4">{t('dashboard.client', 'Клиент')}</th>
										<th className="pb-4">{t('dashboard.description', 'Описание')}</th>
										<th className="pb-4">{t('dashboard.status', 'Статус')}</th>
										<th className="pb-4">{t('dashboard.shelf', 'Полка')}</th>
										<th className="pb-4">{t('dashboard.weight_price', 'Вес/Цена')}</th>
										<th className="pb-4 pr-4 text-right">{t('dashboard.date', 'Дата')}</th>
									</tr>
								</thead>
								<tbody className="text-sm">
									{filteredPackages.length > 0 ? (
										filteredPackages.map((pkg: any) => (
											<tr key={pkg.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors last:border-0">
												<td className="py-4 pl-4 font-black text-gray-900 dark:text-white">{pkg.track_code}</td>
												<td className="py-4 font-bold text-gray-700 dark:text-gray-300">ID: {pkg.client_info?.client_code || '—'}</td>
												<td className="py-4 font-medium text-gray-500 dark:text-gray-400 truncate max-w-[120px] block">{pkg.description || '—'}</td>
												<td className="py-4"><StatusBadge status={pkg.status} display={pkg.status_display} /></td>
												<td className="py-4 font-bold text-gray-500 dark:text-gray-400">{pkg.shelf_location || '—'}</td>
												<td className="py-4">
													<div className="font-black text-gray-900 dark:text-white">{pkg.weight} кг</div>
													<div className="text-[11px] text-gray-400 dark:text-gray-500 font-bold">{pkg.total_price} $</div>
												</td>
												<td className="py-4 pr-4 text-right text-[11px] font-bold text-gray-400">
													{new Date(pkg.created_at).toLocaleDateString('ru-RU')}
												</td>
											</tr>
										))
									) : (
										<tr>
											<td colSpan={7} className="py-12 text-center text-gray-400 font-bold bg-gray-50/30 rounded-2xl">
												{t('dashboard.no_packages', 'Посылок в этой категории нет')}
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* ПРАВАЯ ЧАСТЬ: КНОПКИ (наверху на мобилке, справа на ПК) */}
				<div className="space-y-4 md:space-y-6">

					{/* КНОПКА 1: ТЕРМИНАЛ ПРИЕМКИ (Наш новый сканер) */}
					<button
						onClick={() => setIsAutoScannerOpen(true)}
						className="w-full bg-slate-900 rounded-[2rem] p-6 md:p-8 text-white shadow-xl shadow-slate-900/20 text-left relative overflow-hidden group hover:scale-[1.02] transition-transform flex flex-col justify-center min-h-[160px] md:min-h-[220px]"
					>
						<div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
						<div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-4 md:mb-6 backdrop-blur-md text-white group-hover:bg-white/20 transition-colors">
							<ScanLine size={24} />
						</div>
						<h3 className="text-xl md:text-[22px] font-bold leading-tight mb-1 md:mb-2">{t('dashboard.accept_package', 'Принять посылку')}<br />{t('dashboard.auto_scanner', '(Авто-сканер)')}</h3>
						<p className="text-slate-400 text-[11px] md:text-[13px] font-medium">Китай / Душанбе</p>
					</button>

					{/* КНОПКА 2: ВЫДАЧА КЛИЕНТУ (Старый сканер QR) */}
					<button
						onClick={() => setIsClientScannerOpen(true)}
						className="w-full bg-[#1A5CFF] rounded-[2rem] p-6 md:p-8 text-white shadow-2xl shadow-blue-500/30 text-left relative overflow-hidden group hover:scale-[1.02] transition-transform flex flex-col justify-center min-h-[140px]"
					>
						<div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
						<div className="flex items-center gap-4 mb-2">
							<div className="w-10 h-10 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md text-white group-hover:bg-white/20 transition-colors">
								<span className="text-xl font-light leading-none">+</span>
							</div>
							<h3 className="text-lg font-bold leading-tight">{t('dashboard.handover', 'Выдача')}<br />{t('dashboard.to_client', 'клиенту')}</h3>
						</div>
					</button>

					{/* БЫСТРЫЕ ДЕЙСТВИЯ */}
					<div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 md:p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-50/50 dark:border-slate-800 transition-colors">
						<h3 className="font-bold text-gray-900 dark:text-white mb-4 text-base md:text-lg">{t('dashboard.quick_actions', 'Быстрые действия')}</h3>
						<div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
							<button onClick={handleCreateReport} className="w-full flex justify-center lg:justify-start items-center gap-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 px-4 py-3 md:py-4 rounded-xl transition-colors font-bold text-xs md:text-sm text-gray-600 dark:text-gray-300">
								<FileText size={16} className="text-gray-400 dark:text-gray-500" /> <span className="hidden md:inline">{t('dashboard.create_report', 'Создать отчет')}</span>
							</button>
							<button onClick={handleBroadcast} className="w-full flex justify-center lg:justify-start items-center gap-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 px-4 py-3 md:py-4 rounded-xl transition-colors font-bold text-xs md:text-sm text-red-600 dark:text-red-400">
								<Send size={16} /> {t('dashboard.broadcast', 'Рассылка')}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* --- МОДАЛЬНЫЕ ОКНА --- */}
			<ClientHandoverModal isOpen={isClientScannerOpen} onClose={() => !isScanningProcessing && setIsClientScannerOpen(false)} onSearch={handleClientScan} />
			<ReadyPackagesModal isOpen={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} data={scanResult} onSuccess={fetchStats} onHistoryClick={handleOpenHistory} />
			<ClientHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} clientCode={historyClientCode} />
			<BroadcastModal isOpen={isBroadcastOpen} onClose={() => setIsBroadcastOpen(false)} />

			<ScannerTerminal
				isOpen={isAutoScannerOpen}
				onClose={() => setIsAutoScannerOpen(false)}
				onSuccess={fetchStats}
			/>

			{/* МОДАЛЬНОЕ ОКНО ОТЧЕТОВ */}
			{isReportModalOpen && <ReportModal onClose={() => setIsReportModalOpen(false)} />}
		</motion.div>
	);
};

// ==========================================================
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ (ОНИ ДОЛЖНЫ БЫТЬ ЗДЕСЬ!)
// ==========================================================

const TabButton = ({ active, onClick, icon, label }: any) => (
	<button onClick={onClick} className={`whitespace-nowrap px-4 py-2 md:px-6 md:py-3 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 transition-all ${active ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-lg shadow-gray-300 dark:shadow-blue-900/40' : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800'}`}>
		{icon} {label}
	</button>
);

const StatBox = ({ title, value, icon, bg, shadow, className = '', onClick }: any) => (
	<div
		className={`bg-white dark:bg-slate-900 rounded-[1.2rem] md:rounded-[1.5rem] p-3 md:p-5 flex items-center gap-3 md:gap-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] border border-gray-50 dark:border-slate-800 transition-all duration-200 ${onClick ? 'cursor-pointer hover:scale-[1.03] hover:shadow-md active:scale-[0.98]' : ''} ${className}`}
		onClick={onClick}
	>
		<div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-white ${bg} shadow-md md:shadow-lg ${shadow} shrink-0`}>
			{icon}
		</div>
		<div>
			<p className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">{title}</p>
			<p className="text-lg md:text-[24px] font-black text-gray-900 dark:text-white leading-none">{value}</p>
		</div>
	</div>
);

const StatusBadge = ({ status, display }: { status: string, display: string }) => {
	let style = "bg-gray-50 text-gray-600 border-gray-100";
	switch (status) {
		case 'expected': style = 'bg-gray-100 text-gray-600 border-gray-200'; break;
		case 'china_warehouse': style = 'bg-orange-50 text-orange-600 border-orange-200'; break;
		case 'in_transit': style = 'bg-blue-50 text-blue-600 border-blue-200'; break;
		case 'arrived_dushanbe': style = 'bg-purple-50 text-purple-600 border-purple-200'; break;
		case 'ready_for_pickup': style = 'bg-green-50 text-green-700 border-green-200'; break;
		case 'delivered': style = 'bg-slate-100 text-slate-500 border-slate-200'; break;
	}
	return <span className={`inline-flex items-center px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-[11px] font-bold border whitespace-nowrap ${style}`}>{display}</span>;
};

const ReportModal = ({ onClose }: { onClose: () => void }) => {
	const today = new Date().toISOString().split('T')[0];
	const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

	const [reportType, setReportType] = useState<'packages' | 'clients' | 'finance'>('packages');
	const [dateFrom, setDateFrom] = useState(monthAgo);
	const [dateTo, setDateTo] = useState(today);
	const [loading, setLoading] = useState(false);

	const TYPES = [
		{ id: 'packages', label: '📦 Посылки', desc: 'Все посылки за период с деталями' },
		{ id: 'clients', label: '👥 Клиенты', desc: 'Список всех клиентов и кол-во посылок' },
		{ id: 'finance', label: '💰 Финансы', desc: 'Выданные посылки и суммы за период' },
	];

	const handleDownload = async () => {
		setLoading(true);
		try {
			const response = await api.get(`/api/reports/export/`, {
				params: { type: reportType, date_from: dateFrom, date_to: dateTo },
				responseType: 'blob',
			});
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement('a');
			link.href = url;
			const dateStr = new Date().toISOString().split('T')[0];
			link.setAttribute('download', `kayhon_report_${reportType}_${dateStr}.xlsx`);
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
			toast.success('Отчет успешно скачан!');
			onClose();
		} catch (e) {
			toast.error('Ошибка при генерации отчета');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
			<motion.div
				initial={{ scale: 0.95, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 border border-transparent dark:border-slate-800"
			>
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
							<FileText className="text-blue-600 dark:text-blue-400" size={20} />
						</div>
						<h2 className="text-xl font-black text-gray-900 dark:text-white">Создать отчет</h2>
					</div>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
						<X size={22} />
					</button>
				</div>

				{/* Тип отчета */}
				<div className="mb-5">
					<p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Тип отчета</p>
					<div className="space-y-2">
						{TYPES.map(t => (
							<button
								key={t.id}
								onClick={() => setReportType(t.id as any)}
								className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${reportType === t.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-gray-300 hover:border-gray-200 dark:hover:border-slate-700'}`}
							>
								{t.label}
								<span className="block text-xs font-medium text-gray-400 dark:text-gray-500 mt-0.5">{t.desc}</span>
							</button>
						))}
					</div>
				</div>

				{/* Даты (не нужны для клиентского отчета) */}
				{reportType !== 'clients' && (
					<div className="mb-6">
						<p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
							<Calendar size={12} /> Период
						</p>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1 block">От</label>
								<input
									type="date"
									value={dateFrom}
									onChange={e => setDateFrom(e.target.value)}
									className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
								/>
							</div>
							<div>
								<label className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1 block">До</label>
								<input
									type="date"
									value={dateTo}
									onChange={e => setDateTo(e.target.value)}
									className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
								/>
							</div>
						</div>
					</div>
				)}

				<button
					onClick={handleDownload}
					disabled={loading}
					className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm"
				>
					{loading ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
					{loading ? 'Генерация...' : 'Скачать Excel'}
				</button>
			</motion.div>
		</div>
	);
};

export default DashboardPage;
