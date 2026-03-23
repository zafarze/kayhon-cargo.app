import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import QRCodeLib from "react-qr-code";
const QRCodeComponent = (QRCodeLib as any).default || (QRCodeLib as any).QRCode || QRCodeLib;

import { motion, AnimatePresence } from 'framer-motion';
import {
	Truck, CheckCircle, MapPin, Search,
	Copy, Wallet, Plus, X, ArrowUpRight, Building2,
	Calculator, MessageCircle, HelpCircle, FileText
} from 'lucide-react';
import PublicTrackingModal from '../../components/client/PublicTrackingModal';
import { api } from "../../api";
import { IPackage } from "../../types";
import toast from 'react-hot-toast';

import Header from "../../components/client/Header";
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

// --- ХЕЛПЕРЫ ---
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const getGreeting = () => {
	const hour = new Date().getHours();
	if (hour < 12) return 'Доброе утро';
	if (hour < 18) return 'Добрый день';
	return 'Добрый вечер';
};

// --- КОМПАКТНЫЙ СТАТ-ВИДЖЕТ ---
const StatWidget = ({ label, value, icon: Icon, colorClass, delay }: any) => (
	<motion.div
		initial={{ opacity: 0, y: 20 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.5, delay }}
		className={`relative overflow-hidden p-4 rounded-[1.5rem] border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-default group h-full ${colorClass}`}
	>
		<div className="absolute -top-2 -right-2 p-2 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:rotate-12 group-hover:scale-110">
			<Icon size={60} />
		</div>
		<div className="relative z-10 flex flex-col justify-between h-full gap-3">
			<div className="flex justify-between items-start">
				<div className={`p-2.5 rounded-xl bg-white/60 backdrop-blur-md shadow-sm`}>
					<Icon size={20} />
				</div>
				<div className="bg-white/40 backdrop-blur-sm px-2 py-0.5 rounded-lg">
					<ArrowUpRight size={14} className="opacity-60" />
				</div>
			</div>
			<div>
				<h3 className="text-2xl font-black tracking-tight mb-0.5">{value}</h3>
				<p className="text-[10px] font-bold uppercase tracking-wider opacity-70 leading-tight">{label}</p>
			</div>
		</div>
	</motion.div>
);

// --- КОМПОНЕНТ: БЫСТРЫЕ ДЕЙСТВИЯ (GRID) ---
const QuickAction = ({ icon: Icon, label, color, onClick, delay }: any) => (
	<motion.button
		initial={{ opacity: 0, scale: 0.9 }}
		animate={{ opacity: 1, scale: 1 }}
		transition={{ delay }}
		onClick={onClick}
		whileTap={{ scale: 0.95 }}
		className="flex flex-col items-center justify-center gap-3 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all h-full"
	>
		<div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${color}`}>
			<Icon size={22} />
		</div>
		<span className="text-xs font-bold text-slate-600 text-center leading-tight">{label}</span>
	</motion.button>
);

// --- КАРТОЧКА ПОСЫЛКИ ---
const PackageItem = ({ pkg, index }: { pkg: IPackage, index: number }) => {
	const getStatusColor = (s: string) => {
		switch (s) {
			case 'arrived_dushanbe': return 'bg-purple-50 text-purple-600 border-purple-100';
			case 'delivered': return 'bg-green-50 text-green-600 border-green-100';
			// 👇 ДОБАВИЛИ ЭТУ СТРОКУ 👇
			case 'expected': return 'bg-orange-50 text-orange-600 border-orange-100';
			default: return 'bg-blue-50 text-blue-600 border-blue-100';
		}
	};
	const statusStyle = getStatusColor(pkg.status);

	return (
		<motion.div
			layout
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: index * 0.05 }}
			className="group bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-100/50 hover:border-blue-200 transition-all duration-300 relative overflow-hidden"
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
				<div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl shadow-sm ${statusStyle}`}>
					{pkg.status === 'arrived_dushanbe' ? <MapPin /> : (pkg.status === 'delivered' ? <CheckCircle /> : <Truck />)}
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-3 mb-1">
						<span className="font-mono font-bold text-slate-800 text-lg tracking-tight group-hover:text-blue-600 transition-colors">
							{pkg.track_code}
						</span>
						{parseFloat(pkg.weight) > 0 && (
							<span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-lg">
								{pkg.weight} кг
							</span>
						)}
					</div>
					<p className="text-sm text-slate-400 font-medium truncate pr-4">
						{pkg.description || 'Без описания'}
					</p>
				</div>
				<div className="flex flex-row sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-50">
					<div className="text-right">
						<div className="font-black text-slate-800 text-xl">
							{parseFloat(pkg.total_price) > 0 ? `${pkg.total_price} c.` : '0.00'}
						</div>
					</div>
					<div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
						{new Date(pkg.created_at).toLocaleDateString()}
					</div>
				</div>
			</div>
		</motion.div>
	);
};

const Dashboard = () => {
	const { clientCode } = useParams<{ clientCode: string }>();
	const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>() || { toggleSidebar: () => { } };

	const [packages, setPackages] = useState<IPackage[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<'active' | 'ready' | 'archive'>('active');
	const [search, setSearch] = useState('');
	const [showMobileSearch, setShowMobileSearch] = useState(false);
	const PAGE_SIZE = 15;
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

	// Новые состояния для модалок
	const [showQrModal, setShowQrModal] = useState(false);
	const [showCalcModal, setShowCalcModal] = useState(false);
	const [showTrackingModal, setShowTrackingModal] = useState(false); // <--- СТЕЙТ ДЛЯ ПУБЛИЧНОГО ТРЕКИНГА
	const [calcWeight, setCalcWeight] = useState('');

	// Данные клиента (позже можно брать из AuthStore)
	const userName = "Farid";
	const userPhone = "992900000000";

	const warehouseAddress = {
		city: "Yiwu (Китай)",
		address: "浙江省义乌市后宅街道柳青路1577号里面C区1楼 2号杜尚别仓库2号门"
	};

	const [showAddModal, setShowAddModal] = useState(false);
	const [newTrack, setNewTrack] = useState('');
	const [newDesc, setNewDesc] = useState('');
	const [isAdding, setIsAdding] = useState(false);

	const fetchData = async (showLoading = true) => {
		if (!clientCode) return;
		try {
			const response = await api.get<IPackage[]>(`/api/packages/${clientCode}/`);
			setPackages(response.data);
		} catch (err) {
			console.error(err);
		} finally {
			if (showLoading) setLoading(false);
		}
	};

	useEffect(() => { fetchData(true); }, [clientCode]);

	useAutoRefresh(() => {
		fetchData(false);
	}, 15000);

	const handleAddTrack = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTrack) return toast.error("Введите трек-код");
		setIsAdding(true);
		try {
			await api.post('/api/packages/add/', {
				track_code: newTrack,
				description: newDesc,
				client_code: clientCode
			});
			toast.success("Трек-код успешно добавлен!", { icon: '🚀' });
			setShowAddModal(false);
			setNewTrack(''); setNewDesc('');
			fetchData();
		} catch (err: any) {
			toast.error(err.response?.data?.error || "Ошибка добавления");
		} finally {
			setIsAdding(false);
		}
	};

	// ФУНКЦИЯ: Копирование красивого адреса
	const handleCopyAddress = () => {
		const formattedAddress = `Код клиента: ${clientCode}\nТелефон: ${userPhone}\nАдрес: ${warehouseAddress.address}`;
		navigator.clipboard.writeText(formattedAddress);
		toast.success('Адрес скопирован!', { icon: '📋' });
	};

	// ФУНКЦИЯ: Написать в WhatsApp
	const handleWhatsApp = () => {
		const waText = encodeURIComponent(`Здравствуйте! Мой ID: ${clientCode}. У меня вопрос по доставке...`);
		window.open(`https://wa.me/992900000000?text=${waText}`, '_blank');
	};

	const stats = useMemo(() => {
		const active = packages.filter(p => ['china_warehouse', 'in_transit', 'expected'].includes(p.status)).length;
		const ready = packages.filter(p => p.status === 'arrived_dushanbe').length;
		const debt = packages
			.filter(p => p.status === 'arrived_dushanbe' && !p.is_paid)
			.reduce((acc, curr) => acc + Number(curr.total_price || 0), 0);
		return { active, ready, debt };
	}, [packages]);

	const filteredList = useMemo(() => {
		return packages.filter(pkg => {
			const isReady = pkg.status === 'arrived_dushanbe';
			const isArchive = pkg.status === 'delivered';
			const isActive = !isReady && !isArchive;

			if (activeTab === 'ready' && !isReady) return false;
			if (activeTab === 'archive' && !isArchive) return false;
			if (activeTab === 'active' && !isActive) return false;

			if (search) {
				const term = search.toLowerCase();
				return pkg.track_code.toLowerCase().includes(term) || pkg.description?.toLowerCase().includes(term);
			}
			return true;
		});
	}, [packages, activeTab, search]);

	// Сброс пагинации при смене таба или поиска
	useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeTab, search]);

	const visibleList = filteredList.slice(0, visibleCount);

	return (
		<div className="min-h-screen bg-[#F4F7FE] font-sans text-slate-800 relative">

			<Header
				user={{ first_name: userName, client_code: clientCode || "" }}
				greeting={getGreeting()}
				onOpenQr={() => setShowQrModal(true)} // Открываем модалку QR
				onSearch={(val) => setSearch(val)}
				toggleSidebar={toggleSidebar}
			/>

			<div className="max-w-[1600px] mx-auto pb-24 px-4 md:px-6 relative z-0">

				{/* 1. МОБИЛЬНОЕ ПРИВЕТСТВИЕ И ПОИСК */}
				<div className="md:hidden mb-6 px-2">
					<div className="flex justify-between items-start">
						<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
							<h1 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">
								{getGreeting()}, <br /><span className="text-blue-600">{capitalize(userName)}</span> 👋
							</h1>
							<p className="text-slate-400 font-bold mt-2 text-xs uppercase tracking-wider">
								Сводка на сегодня
							</p>
							<a
								href={`/telegram/${clientCode}?tg=true`}
								target="_blank"
								rel="noreferrer"
								className="inline-flex mt-4 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs items-center gap-2 active:scale-95 transition-all border border-blue-100"
							>
								📱 Открыть Telegram Mini App
							</a>
						</motion.div>

						<button
							onClick={() => setShowMobileSearch(!showMobileSearch)}
							className={`mt-3 p-3 rounded-2xl shadow-sm border transition-all ${showMobileSearch ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100'}`}
						>
							{showMobileSearch ? <X size={20} /> : <Search size={20} />}
						</button>
					</div>

					<AnimatePresence>
						{showMobileSearch && (
							<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4">
								<div className="flex items-center bg-white border border-blue-200 shadow-lg shadow-blue-100/50 rounded-2xl px-4 py-3">
									<Search size={18} className="text-blue-500 mr-3" />
									<input
										id="mobile-search"
										autoFocus
										type="text"
										placeholder="Поиск по своим трек-кодам..."
										className="flex-1 bg-transparent border-none outline-none font-bold text-slate-800 placeholder:text-slate-300"
										value={search}
										onChange={(e) => setSearch(e.target.value)}
									/>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* 2. БАННЕР АДРЕСА */}
				<motion.div
					initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
					className="bg-[#1E293B] rounded-[2rem] p-6 md:p-8 text-white shadow-xl shadow-slate-300/50 relative overflow-hidden mb-8 group"
				>
					<div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[80px] -mt-20 -mr-20 pointer-events-none"></div>

					<div className="relative z-10">
						<div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
							<div className="space-y-4 max-w-3xl">
								<div className="flex flex-wrap items-center gap-3">
									<span className="bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-sm">
										China Warehouse
									</span>
									<span className="text-slate-400 text-xs font-bold flex items-center gap-1">
										<Building2 size={12} /> {warehouseAddress.city}
									</span>
								</div>

								<div>
									<h2 className="text-lg md:text-2xl font-mono font-bold leading-relaxed opacity-90 break-words">
										{warehouseAddress.address}
									</h2>
									<div className="mt-3 flex flex-wrap gap-2">
										<span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-1 rounded-lg font-mono font-bold text-lg">
											{clientCode}
										</span>
										<span className="bg-slate-700/50 text-slate-300 border border-slate-600 px-3 py-1 rounded-lg font-mono font-bold text-lg">
											{userPhone}
										</span>
									</div>
									<p className="text-slate-500 text-[10px] mt-2 font-bold uppercase">
										* Ваш персональный код и телефон добавлены к адресу
									</p>
								</div>
							</div>

							<div className="flex flex-col gap-3 w-full md:w-auto mt-2 md:mt-0">
								<motion.button
									whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
									onClick={handleCopyAddress}
									className="bg-white text-slate-900 px-5 py-3 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-lg shrink-0"
								>
									<Copy size={18} />
									<span>Скопировать адрес</span>
								</motion.button>

								<a
									href={`/telegram/${clientCode}?tg=true`}
									target="_blank"
									rel="noreferrer"
									className="hidden md:flex bg-blue-500/20 text-blue-200 border border-blue-400/30 px-5 py-3 rounded-xl font-bold text-sm hover:bg-blue-500/30 transition-colors items-center justify-center gap-2 shadow-lg shrink-0"
								>
									📱 Протестировать Mini App
								</a>
							</div>
						</div>
					</div>
				</motion.div>

				{/* 3. СТАТИСТИКА */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6">
					<StatWidget label="В пути" value={stats.active} icon={Truck} colorClass="bg-blue-50 border-blue-100 text-blue-700 hover:shadow-blue-200" delay={0.2} />
					<StatWidget label="На складе" value={stats.ready} icon={MapPin} colorClass="bg-purple-50 border-purple-100 text-purple-700 hover:shadow-purple-200" delay={0.3} />
					<div className="col-span-2 md:col-span-1">
						<StatWidget label="К оплате" value={`${stats.debt} c.`} icon={Wallet} colorClass={stats.debt > 0 ? "bg-red-50 border-red-100 text-red-700 hover:shadow-red-200" : "bg-green-50 border-green-100 text-green-700 hover:shadow-green-200"} delay={0.4} />
					</div>
				</div>

				{/* 4. БЫСТРЫЕ ДЕЙСТВИЯ */}
				<div className="mb-8">
					<h4 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4 px-2">Быстрые действия</h4>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<QuickAction
							icon={Calculator} label="Калькулятор" color="bg-orange-500 shadow-orange-200" delay={0.5}
							onClick={() => setShowCalcModal(true)}
						/>
						<QuickAction
							icon={MessageCircle} label="Написать нам" color="bg-green-500 shadow-green-200" delay={0.6}
							onClick={handleWhatsApp}
						/>
						<QuickAction
							icon={FileText} label="Проверить трек" color="bg-blue-500 shadow-blue-200" delay={0.7}
							onClick={() => setShowTrackingModal(true)} // <--- ТУТ ИЗМЕНЕНА ЛОГИКА
						/>
						<QuickAction
							icon={HelpCircle} label="Вопросы (FAQ)" color="bg-indigo-500 shadow-indigo-200" delay={0.8}
							onClick={() => toast('Раздел FAQ в разработке', { icon: '❓' })}
						/>
					</div>
				</div>

				{/* 5. СПИСОК (С ТАБАМИ) */}
				<div className="flex flex-col xl:flex-row gap-8">
					<div className="flex-1">
						<div className="mb-6">
							<div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-3 gap-1">
								{[{ id: 'active', label: 'В пути', icon: Truck }, { id: 'ready', label: 'На складе', icon: MapPin }, { id: 'archive', label: 'Архив', icon: CheckCircle }].map(tab => (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id as any)}
										className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${activeTab === tab.id
											? 'bg-slate-800 text-white shadow-md'
											: 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
											}`}
									>
										<tab.icon size={14} className="shrink-0" />
										<span className="truncate">{tab.label}</span>
									</button>
								))}
							</div>
						</div>

						<div className="space-y-4 min-h-[400px]">
							{loading ? (
								[1, 2, 3].map(i => <div key={i} className="bg-white h-24 rounded-3xl animate-pulse"></div>)
							) : filteredList.length === 0 ? (
								<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
									<div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300"><Search size={40} /></div>
									<h3 className="text-xl font-black text-slate-800 mb-2">Ничего не найдено</h3>
									<p className="text-slate-400 text-sm max-w-xs mx-auto mb-8">В этом разделе пока нет посылок.</p>
									<button onClick={() => setShowAddModal(true)} className="text-blue-600 font-bold hover:underline flex items-center gap-2"><Plus size={18} /> Добавить посылку</button>
								</motion.div>
							) : (
								<>
									{/* Счётчик */}
									<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
										Показано {Math.min(visibleCount, filteredList.length)} из {filteredList.length}
									</p>
									<AnimatePresence mode='popLayout'>
										{visibleList.map((pkg, idx) => (<PackageItem key={pkg.id} pkg={pkg} index={idx} />))}
									</AnimatePresence>
									{/* Кнопка «Показать ещё» */}
									{visibleCount < filteredList.length && (
										<motion.button
											initial={{ opacity: 0 }} animate={{ opacity: 1 }}
											onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
											className="w-full mt-4 py-4 rounded-2xl bg-white border-2 border-slate-100 hover:border-blue-300 hover:bg-blue-50 text-slate-500 hover:text-blue-600 font-bold text-sm transition-all"
										>
											Показать ещё ({filteredList.length - visibleCount})
										</motion.button>
									)}
								</>
							)}
						</div>
					</div>

					{/* Правая колонка ПК: Добавление трека */}
					<div className="hidden xl:block w-80 shrink-0 space-y-6">
						<motion.button whileHover={{ scale: 1.02, translateY: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setShowAddModal(true)} className="w-full bg-blue-600 text-white p-6 rounded-[2rem] shadow-xl shadow-blue-200 flex flex-col items-start gap-4 group relative overflow-hidden">
							<div className="absolute -right-10 -top-10 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
							<div className="bg-white/20 p-3 rounded-2xl"><Plus size={24} className="text-white" /></div>
							<div className="text-left relative z-10"><h3 className="text-lg font-black">Добавить трек</h3><p className="text-blue-100 text-xs font-bold mt-1">Зарегистрируйте новую покупку</p></div>
						</motion.button>
					</div>
				</div>

				<motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setShowAddModal(true)} className="fixed bottom-6 right-6 xl:hidden w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center z-50 hover:bg-blue-700 active:scale-90 transition-all">
					<Plus size={24} />
				</motion.button>

			</div>

			{/* ======================= */}
			{/* МОДАЛЬНЫЕ ОКНА */}
			{/* ======================= */}

			{/* МОДАЛКА: Добавление трек кода */}
			<AnimatePresence>
				{showAddModal && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
						<motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
							<div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-800">Новая посылка</h3><button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X size={20} className="text-slate-400" /></button></div>
							<form onSubmit={handleAddTrack} className="space-y-6">
								<div><label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Трек-код</label><div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input autoFocus type="text" value={newTrack} onChange={e => setNewTrack(e.target.value)} placeholder="CN123456789" className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 font-mono text-lg font-bold outline-none transition-all placeholder:text-slate-300" /></div></div>
								<div><label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Описание (необязательно)</label><input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Одежда, Электроника..." className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl py-4 px-6 font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300" /></div>
								<button type="submit" disabled={isAdding} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2 mt-4">{isAdding ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : 'Добавить посылку'}</button>
							</form>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* МОДАЛКА: Калькулятор */}
			<AnimatePresence>
				{showCalcModal && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCalcModal(false)}>
						<motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-md w-full relative">
							<button onClick={() => setShowCalcModal(false)} className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X size={20} /></button>
							<div className="flex items-center gap-3 mb-6">
								<div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center shadow-sm"><Calculator size={24} /></div>
								<div>
									<h3 className="text-xl font-black text-slate-800">Калькулятор</h3>
									<p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Примерный расчет</p>
								</div>
							</div>
							<div className="space-y-4">
								<div>
									<label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Вес посылки (кг)</label>
									<input
										type="number"
										value={calcWeight}
										onChange={e => setCalcWeight(e.target.value)}
										placeholder="Например: 2.5"
										className="w-full bg-slate-50 border-2 border-slate-100 focus:border-orange-500 rounded-2xl py-4 px-6 font-bold text-slate-800 outline-none transition-all"
										autoFocus
									/>
								</div>
								<div className="bg-slate-800 rounded-2xl p-6 text-white flex justify-between items-center shadow-xl shadow-slate-200/50">
									<div>
										<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ориентировочно</p>
										<div className="text-3xl font-black">
											{calcWeight ? (parseFloat(calcWeight) * 4.5).toFixed(2) : '0.00'} <span className="text-lg text-slate-400 font-medium">$</span>
										</div>
									</div>
									<div className="text-right">
										<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Тариф</p>
										<div className="text-sm font-bold text-orange-400 bg-orange-400/10 px-2 py-1 rounded-lg">4.5$ / кг</div>
									</div>
								</div>
								<p className="text-[10px] font-bold text-slate-400 text-center mt-4 uppercase leading-tight">
									* Точная стоимость рассчитывается на складе в Душанбе с учетом фактического объема и веса.
								</p>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* МОДАЛКА: QR Код клиента */}
			<AnimatePresence>
				{showQrModal && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowQrModal(false)}>
						<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
							<button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X size={20} /></button>
							<h3 className="text-xl font-black text-slate-800 mb-1 mt-2">Ваш QR-код</h3>
							<p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">Для быстрой выдачи на складе</p>

							<div className="bg-white p-4 rounded-3xl border-2 border-dashed border-slate-200 inline-block mb-6 relative hover:border-blue-300 transition-colors">
								<QRCodeComponent 
									value={`CLIENT:${clientCode}`} 
									size={192} 
									bgColor="#ffffff"
									fgColor="#1e293b" // slate-800
									level="H"
								/>
							</div>

							<div className="bg-slate-50 rounded-2xl py-4 px-4 flex items-center justify-center gap-3 border border-slate-100 w-full">
								<span className="text-xs font-black text-slate-400 uppercase tracking-widest">Ваш ID:</span>
								<span className="text-2xl font-black text-blue-600 font-mono tracking-wider">{clientCode}</span>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* МОДАЛКА: Публичное отслеживание трек-кода */}
			<PublicTrackingModal
				isOpen={showTrackingModal}
				onClose={() => setShowTrackingModal(false)}
			/>

		</div>
	);
};

export default Dashboard;