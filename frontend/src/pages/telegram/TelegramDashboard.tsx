import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';
import { useAuthStore } from '../../store/authStore';
import {
	Package, Truck, Plus, Calculator, MessageCircle,
	HelpCircle, Settings, Search, Clock, List, Home, BarChart3, X, CheckCircle, MapPin, Smartphone, QrCode, Instagram, Phone, Send, Bot, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api';
import { IPackage } from '../../types';
import toast from 'react-hot-toast';
import PublicTrackingModal from '../../components/client/PublicTrackingModal';
import { ChatSection } from '../../components/telegram/ChatSection';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import QRCodeLib from "react-qr-code";

const QRCodeComponent = (QRCodeLib as any).default || (QRCodeLib as any).QRCode || QRCodeLib;

const TelegramDashboard = () => {
	const { clientCode } = useParams<{ clientCode: string }>();
	const { tg, user } = useTelegram();

	// --- AUTH STORE ---
	const { isAuthenticated, login, logout } = useAuthStore();

	// --- UNREAD CHAT BADGE ---
	const [unreadCount, setUnreadCount] = useState(0);

	const [activeTab, setActiveTab] = useState('home');
	const [listFilter, setListFilter] = useState<'all' | 'in_transit' | 'dushanbe'>('all');
	const [visibleCount, setVisibleCount] = useState(20);

	// --- ПРОФИЛЬ ---
	const [profileData, setProfileData] = useState({ first_name: '', phone_number: '', address: '' });
	const [isSavingProfile, setIsSavingProfile] = useState(false);

	// --- ПАРОЛЬ ---
	const [showPasswordModal, setShowPasswordModal] = useState(false);
	const [passwords, setPasswords] = useState({ old_password: '', new_password: '' });
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	// --- СОСТОЯНИЕ ДАННЫХ ---
	const [packages, setPackages] = useState<IPackage[]>([]);
	const [loading, setLoading] = useState(true);

	// --- СОСТОЯНИЕ МОДАЛОК ---
	const [showCalc, setShowCalc] = useState(false);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showTrackingModal, setShowTrackingModal] = useState(false);
	const [showFAQ, setShowFAQ] = useState(false);
	const [showDeliveryModal, setShowDeliveryModal] = useState(false);
	const [showQrModal, setShowQrModal] = useState(false);
	const [showContactModal, setShowContactModal] = useState(false);

	// Данные для формы добавления
	const [newTrack, setNewTrack] = useState('');
	const [newDesc, setNewDesc] = useState('');
	const [isAdding, setIsAdding] = useState(false);

	// --- PWA INSTALLATION ---
	const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
	const [isIOS, setIsIOS] = useState(false);
	const [isStandalone, setIsStandalone] = useState(false);

	useEffect(() => {
		if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
			setIsStandalone(true);
		}

		const userAgent = window.navigator.userAgent.toLowerCase();
		setIsIOS(/iphone|ipad|ipod/.test(userAgent));

		const handler = (e: any) => {
			e.preventDefault();
			setDeferredPrompt(e);
		};
		window.addEventListener('beforeinstallprompt', handler);
		return () => window.removeEventListener('beforeinstallprompt', handler);
	}, []);

	const handleInstallClick = async () => {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;
			if (outcome === 'accepted') setDeferredPrompt(null);
		} else if (isIOS) {
			toast.success("В Safari нажмите 'Поделиться' (квадрат со стрелкой) и выберите 'На экран Домой'", { duration: 6000, icon: "🍏" });
		}
	};

	// Калькулятор
	const [calcWeight, setCalcWeight] = useState('');
	const [calcPrice, setCalcPrice] = useState<number | null>(null);
	const RATE_PER_KG = 4.5;

	// Доставка
	const [selectedPackages, setSelectedPackages] = useState<number[]>([]);
	const [deliveryAddress, setDeliveryAddress] = useState('');
	const [deliveryPhone, setDeliveryPhone] = useState('');
	const [deliveryComment, setDeliveryComment] = useState('');
	const [isRequestingDelivery, setIsRequestingDelivery] = useState(false);

	useEffect(() => {
		tg?.ready();
		tg?.expand();
		tg?.MainButton.hide();

		const initApp = async () => {
			if (!isAuthenticated) {
				// Предпочитаем initData (содержит подпись Telegram) — безопасно
				// Если initData пустой (локальная разработка) — fallback на telegram_id
				const initData = tg?.initData;
				const tgId = user?.id || tg?.initDataUnsafe?.user?.id;

				if (initData || tgId) {
					try {
						const payload = initData
							? { init_data: initData }              // 🔒 продакшен: с проверкой подписи
							: { telegram_id: tgId };               // 🔓 dev-fallback: без проверки

						const res = await api.post('/api/auth/telegram/', payload);
						login(res.data.access, {
							client_code: res.data.client_code,
							first_name: res.data.first_name,
							is_admin: res.data.is_admin
						});
						// После успешного логина НЕ делаем return — падаем вниз к fetchData/fetchProfile
					} catch (err) {
						console.error("Auto-login failed:", err);
						toast.error("Не удалось авторизоваться через Telegram.");
					}
				}
			}
			// Один вызов загрузки данных — и при уже авторизованном, и после auto-login
			fetchData(true);
			fetchProfile();
		};

		initApp();
	}, [clientCode, tg, user, isAuthenticated, login]);

	const fetchProfile = async () => {
		try {
			const res = await api.get('/api/auth/me/');
			setProfileData({
				first_name: res.data.first_name || '',
				phone_number: res.data.phone_number || res.data.username || '',
				address: res.data.address || '',
			});
			setUnreadCount(res.data.unread_messages || 0);
		} catch (err) {
			console.error("Ошибка загрузки профиля:", err);
		}
	};

	const fetchData = async (showLoading = true) => {
		if (!clientCode) return;
		try {
			const response = await api.get<IPackage[]>(`/api/packages/${clientCode}/`);
			setPackages(response.data);
		} catch (err) {
			console.error("Ошибка загрузки:", err);
		} finally {
			if (showLoading) setLoading(false);
		}
	};

	useAutoRefresh(() => {
		fetchData(false);
		fetchProfile();
	}, 15000);

	// --- ЛОГИКА ДОБАВЛЕНИЯ ТРЕКА ---
	const handleAddTrack = async () => {
		if (!newTrack) {
			tg?.showPopup({ title: 'Ошибка', message: 'Введите трек-код!', buttons: [{ type: 'ok' }] });
			return;
		}

		setIsAdding(true);
		try {
			await api.post('/api/packages/add/', {
				track_code: newTrack,
				description: newDesc,
				client_code: clientCode
			});

			toast.success("Трек добавлен!", { icon: '✅' });
			setShowAddModal(false);
			setNewTrack('');
			setNewDesc('');
			fetchData();
			setActiveTab('list');
		} catch (err: unknown) {
			const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Ошибка сохранения";
			toast.error(errorMsg);
			tg?.HapticFeedback.notificationOccurred('error');
		} finally {
			setIsAdding(false);
		}
	};

	// --- ЛОГИКА ЗАКАЗА ДОСТАВКИ ---
	const handleSaveProfile = async () => {
		setIsSavingProfile(true);
		try {
			await api.patch('/api/auth/me/', profileData);
			toast.success('Профиль обновлен!', { icon: '✅' });
		} catch {
			toast.error('Ошибка сохранения профиля');
		} finally {
			setIsSavingProfile(false);
		}
	};

	const handleChangePassword = async () => {
		if (!passwords.old_password || !passwords.new_password) {
			toast.error('Заполните все поля!');
			return;
		}
		setIsChangingPassword(true);
		try {
			await api.post('/api/auth/change-password/', passwords);
			toast.success('Пароль успешно изменен!', { icon: '✅' });
			setShowPasswordModal(false);
			setPasswords({ old_password: '', new_password: '' });
		} catch (err: unknown) {
			const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка при смене пароля';
			toast.error(errorMsg);
		} finally {
			setIsChangingPassword(false);
		}
	};

	const handleRequestDelivery = async () => {
		if (selectedPackages.length === 0) {
			toast.error("Выберите хотя бы одну посылку!");
			return;
		}
		if (!deliveryAddress || !deliveryPhone) {
			toast.error("Заполните адрес и телефон!");
			return;
		}

		setIsRequestingDelivery(true);
		try {
			await api.post('/api/delivery/request/', {
				client_code: clientCode,
				package_ids: selectedPackages,
				address: deliveryAddress,
				phone: deliveryPhone,
				comment: deliveryComment
			});

			toast.success("Заявка на доставку создана!", { icon: '🚚' });
			setShowDeliveryModal(false);
			setSelectedPackages([]);
			setDeliveryAddress('');
			setDeliveryPhone('');
			setDeliveryComment('');
			fetchData();
			setListFilter('all');
			setActiveTab('list');
		} catch (err: unknown) {
			const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Ошибка создания заявки";
			toast.error(errorMsg);
			tg?.HapticFeedback.notificationOccurred('error');
		} finally {
			setIsRequestingDelivery(false);
		}
	};

	const togglePackageSelection = (id: number) => {
		setSelectedPackages(prev =>
			prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
		);
	};

	const stats = useMemo(() => {
		const active = packages.filter(p => ['china_warehouse', 'in_transit', 'expected'].includes(p.status)).length;
		const ready = packages.filter(p => p.status === 'arrived_dushanbe').length;
		const totalWeight = packages.reduce((sum, p) => sum + Number(p.weight || 0), 0);
		const totalSpent = packages.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
		return { active, ready, totalWeight, totalSpent, total: packages.length };
	}, [packages]);

	const handleSupportContact = () => {
		setShowContactModal(true);
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'arrived_dushanbe': return { bg: 'bg-purple-100 text-purple-700', label: 'На складе', icon: MapPin };
			case 'delivered': return { bg: 'bg-green-100 text-green-700', label: 'Выдано', icon: CheckCircle };
			case 'in_delivery': return { bg: 'bg-indigo-100 text-indigo-700', label: 'На доставку', icon: Truck };
			// 👇 МЕНЯЕМ ТЕКСТ ЗДЕСЬ 👇
			case 'expected': return { bg: 'bg-orange-50 text-orange-600', label: 'Доставка по Китаю', icon: Truck };
			default: return { bg: 'bg-blue-50 text-blue-600', label: 'В пути', icon: Truck };
		}
	};

	const handleCalculate = () => {
		const weight = parseFloat(calcWeight);
		if (weight > 0) setCalcPrice(weight * RATE_PER_KG);
	};

	// Карточка меню
	const MenuCard = ({ icon: Icon, label, color, onClick, delay }: { icon: React.ElementType, label: string, color: string, onClick: () => void, delay: number }) => {
		const cardBgColor = tg?.themeParams?.secondary_bg_color || '#ffffff';
		const cardTextColor = tg?.themeParams?.text_color || '#000000';

		return (
			<motion.button
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ delay }}
				onClick={onClick}
				whileTap={{ scale: 0.95 }}
				className="flex flex-col items-center justify-center p-3 rounded-2xl gap-2 h-24 relative overflow-hidden shadow-sm border border-slate-100"
				style={{ backgroundColor: cardBgColor }}
			>
				<div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md ${color}`}>
					<Icon size={20} />
				</div>
				<span className="text-[10px] font-bold text-center leading-tight opacity-90" style={{ color: cardTextColor }}>
					{label}
				</span>
			</motion.button>
		);
	};

	const bgColor = tg?.themeParams?.bg_color || '#f5f5f5';
	const textColor = tg?.themeParams?.text_color || '#000000';
	const secondaryBgColor = tg?.themeParams?.secondary_bg_color || '#ffffff';

	// ОБЩАЯ ФУНКЦИЯ ФИЛЬТРАЦИИ
	const filteredPackages = useMemo(() => {
		return packages.filter(p => {
			const matchesFilter =
				(listFilter === 'all') ||
				(listFilter === 'in_transit' && ['china_warehouse', 'in_transit', 'expected'].includes(p.status)) ||
				(listFilter === 'dushanbe' && p.status === 'arrived_dushanbe');

			const matchesSearch = newTrack ? p.track_code.toLowerCase().includes(newTrack.toLowerCase()) : true;
			return matchesFilter && matchesSearch;
		});
	}, [packages, listFilter, newTrack]);

	const sortedFilteredPackages = useMemo(() => {
		return [...filteredPackages].sort((a, b) => {
			if (a.status === 'delivered' && b.status !== 'delivered') return 1;
			if (a.status !== 'delivered' && b.status === 'delivered') return -1;
			return 0;
		});
	}, [filteredPackages]);

	useEffect(() => {
		setVisibleCount(20);
	}, [listFilter, newTrack]);

	const visiblePackages = sortedFilteredPackages.slice(0, visibleCount);

	return (
		<div
			className="min-h-screen font-sans pb-24"
			style={{ backgroundColor: bgColor, color: textColor }}
		>

			{/* === ГЛАВНАЯ === */}
			{activeTab === 'home' && (
				<div className="p-4 pt-6 animate-in fade-in duration-300">
					{/* Шапка */}
					<div className="flex justify-between items-center mb-6">
						<div className="flex items-center gap-3">
							<div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500 p-0.5">
								{user?.photo_url ? (
									<img src={user.photo_url} alt="Ava" className="w-full h-full rounded-full object-cover" />
								) : (
									<div className="w-full h-full bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">
										{user?.first_name?.[0] || 'K'}
									</div>
								)}
							</div>
							<div>
								<h2 className="font-black text-lg leading-none">{user?.first_name || 'Клиент'}</h2>
								<p className="text-xs opacity-60 font-bold mt-1">ID: {clientCode}</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={() => setShowQrModal(true)}
								className="p-2 rounded-full bg-blue-500/10 text-blue-600 active:scale-95 transition-transform"
							>
								<QrCode size={20} />
							</button>
							<button
								onClick={() => setActiveTab('profile')}
								className="p-2 rounded-full bg-yellow-400/20 text-yellow-600 active:scale-95 transition-transform"
							>
								<Settings size={20} />
							</button>
						</div>
					</div>

					{/* Баннер Статистики */}
					<div className="w-full h-32 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden shadow-lg shadow-blue-500/20 mb-6 flex items-center justify-around px-2 text-white">
						<div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>

						<div className="text-center z-10" onClick={() => setActiveTab('list')}>
							<div className="text-3xl font-black">{stats.active}</div>
							<div className="text-[10px] uppercase font-bold opacity-80">В пути</div>
						</div>
						<div className="w-[1px] h-10 bg-white/20"></div>
						<div className="text-center z-10" onClick={() => { setListFilter('all'); setActiveTab('list'); }}>
							<div className="text-3xl font-black">{stats.ready}</div>
							<div className="text-[10px] uppercase font-bold opacity-80">На складе</div>
						</div>
					</div>

					{/* Баннер Установки PWA */}
					{!isStandalone && (deferredPrompt || isIOS) && (
						<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border border-slate-700 shadow-xl shadow-slate-900/30 mb-6 p-5 text-center flex flex-col justify-center items-center relative overflow-hidden">
							<div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>

							<div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
								<Smartphone size={24} className="text-blue-400" />
							</div>

							<h3 className="text-white font-black text-lg tracking-tight mb-1">Установить приложение</h3>
							<p className="text-slate-400 text-xs font-medium mb-5 max-w-[200px] leading-relaxed">Получите быстрый доступ к вашим посылкам прямо с экрана телефона</p>

							<button onClick={handleInstallClick} className="w-[85%] sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-8 rounded-full text-sm transition-all shadow-lg shadow-blue-500/30 active:scale-95 border border-blue-400/30 relative z-10 flex items-center justify-center gap-2">
								{isIOS ? 'ИНСТРУКЦИЯ (iOS)' : 'УСТАНОВИТЬ'}
							</button>
						</motion.div>
					)}

					{/* СЕТКА МЕНЮ */}
					<div className="grid grid-cols-3 gap-3">
						<MenuCard icon={List} label="Все" color="bg-green-500" delay={0.1} onClick={() => { setListFilter('all'); setActiveTab('list'); }} />
						<MenuCard icon={Plus} label="Добавить" color="bg-blue-500" delay={0.15} onClick={() => setShowAddModal(true)} />
						<MenuCard icon={Search} label="Проверить" color="bg-orange-500" delay={0.2} onClick={() => setShowTrackingModal(true)} />

						<MenuCard icon={Truck} label="Доставка" color="bg-indigo-500" delay={0.25} onClick={() => { setListFilter('in_transit'); setActiveTab('list'); }} />
						<MenuCard icon={MapPin} label="Склад Душанбе" color="bg-purple-500" delay={0.3} onClick={() => { setListFilter('dushanbe'); setActiveTab('list'); }} />
						<MenuCard icon={MessageCircle} label="Связь" color="bg-teal-500" delay={0.35} onClick={handleSupportContact} />

						<MenuCard icon={Calculator} label="Калькулятор" color="bg-red-500" delay={0.4} onClick={() => setShowCalc(true)} />
						<MenuCard icon={HelpCircle} label="Вопросы" color="bg-yellow-500" delay={0.45} onClick={() => setShowFAQ(true)} />
						<MenuCard icon={Settings} label="Профиль" color="bg-gray-500" delay={0.5} onClick={() => setActiveTab('profile')} />
					</div>
				</div>
			)}

			{/* === СПИСОК ПОСЫЛОК === */}
			{activeTab === 'list' && (
				<div className="p-4 pt-6 animate-in fade-in slide-in-from-right-10 duration-300">
					<div className="flex flex-col gap-4 mb-4">
						<div className="flex flex-col gap-2">
							<div className="flex justify-between items-center">
								<h2 className="text-2xl font-black">
									{listFilter === 'in_transit' ? 'В пути' : listFilter === 'dushanbe' ? 'Склад Душанбе' : 'Все'}
								</h2>
								<span className="text-xs font-bold bg-slate-200 px-2 py-1 rounded text-slate-600">
									{sortedFilteredPackages.length}
								</span>
							</div>

							{/* Search Bar */}
							<div className="relative w-full">
								<Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
								<input
									type="text"
									placeholder="Поиск по трек-коду..."
									value={newTrack}
									onChange={(e) => setNewTrack(e.target.value)}
									className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-sm"
									style={{ backgroundColor: secondaryBgColor, color: textColor }}
								/>
							</div>
						</div>

						{/* Табы фильтрации */}
						<div className="flex gap-2 p-1 bg-slate-100 rounded-xl" style={{ backgroundColor: secondaryBgColor }}>
							<button
								onClick={() => setListFilter('all')}
								className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${listFilter === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
							>
								Все
							</button>
							<button
								onClick={() => setListFilter('in_transit')}
								className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${listFilter === 'in_transit' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
							>
								В пути
							</button>
							<button
								onClick={() => setListFilter('dushanbe')}
								className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${listFilter === 'dushanbe' ? 'bg-white shadow-sm text-green-600' : 'text-slate-500'}`}
							>
								Склад Душанбе
							</button>
						</div>
					</div>

					{listFilter === 'all' && sortedFilteredPackages.length > 0 && (
						<div className="mb-4">
							<button
								onClick={() => {
									setDeliveryAddress(profileData.address || '');
									setDeliveryPhone(profileData.phone_number || '');
									setShowDeliveryModal(true);
								}}
								className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex justify-center items-center gap-2"
							>
								<Truck size={18} />
								Заказать доставку
							</button>
						</div>
					)}

					<div className="space-y-3 pb-20">
						{loading ? (
							<div className="text-center py-10 text-slate-400 font-bold">Загрузка...</div>
						) : sortedFilteredPackages.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-slate-400">
								<Package size={48} className="mb-3 opacity-20" />
								<span className="font-bold text-sm">Список пуст</span>
								{listFilter === 'all' && !newTrack && (
									<button onClick={() => setShowAddModal(true)} className="mt-4 text-blue-500 font-bold text-sm">Добавить трек</button>
								)}
							</div>
						) : (
							<React.Fragment>
								{visiblePackages.map((pkg) => {
									const status = getStatusColor(pkg.status);
									const StatusIcon = status.icon;
									const isSelected = selectedPackages.includes(pkg.id);

									const canSelect = listFilter === 'all' && pkg.status === 'arrived_dushanbe';

									return (
										<div
											key={pkg.id}
											onClick={() => canSelect ? togglePackageSelection(pkg.id) : undefined}
											className={`p-4 rounded-2xl shadow-sm border transition-colors flex items-center justify-between ${canSelect ? 'cursor-pointer active:scale-[0.98]' : ''
												} ${isSelected ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100'}`}
											style={{ backgroundColor: isSelected ? undefined : secondaryBgColor }}
										>
											<div className="flex items-center gap-3 overflow-hidden">
												{canSelect ? (
													<div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
														}`}>
														{isSelected && <CheckCircle size={14} className="text-white" />}
													</div>
												) : (
													<div className={`p-3 rounded-xl shrink-0 ${status.bg}`}>
														<StatusIcon size={20} />
													</div>
												)}
												<div className="min-w-0">
													<div className="font-bold text-sm truncate pr-2 flex items-center gap-2" style={{ color: textColor }}>
														{pkg.track_code}
													</div>
													<div className="text-xs opacity-70 truncate flex items-center gap-1.5 mt-0.5">
														{/* Показываем описание, если оно есть */}
														{pkg.description && (
															<span className="font-bold text-slate-700">{pkg.description}</span>
														)}

														{/* Точка-разделитель, если есть и описание, и статус */}
														{pkg.description && <span>•</span>}

														{/* Показываем статус (с бэкенда или локальный) */}
														<span>{pkg.status_display || status.label}</span>
													</div>
												</div>
											</div>
											<div className="text-right shrink-0 flex flex-col items-end">
												<div className="font-black text-sm" style={{ color: textColor }}>
													{Number(pkg.total_price) > 0 ? `${pkg.total_price} с.` : '—'}
												</div>
												<div className="text-[10px] opacity-50 font-bold">
													{Number(pkg.weight) > 0 ? `${pkg.weight} кг` : '—'}
												</div>

												{/* СТАТУС ДЛЯ ВКЛАДКИ ДОСТАВКИ */}
												{listFilter === 'all' && pkg.status === 'in_delivery' && (
													<div className="mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
														{/* Проверяем статус курьера: нужно добавить courier_status в бэкенд */}
														{((pkg as IPackage & { courier_status?: string }).courier_status === 'accepted') ? 'Принят курьером' : 'Ожидает курьера'}
													</div>
												)}

												{/* ДАТА ДЛЯ ВКЛАДКИ ВЫДАН */}
												{listFilter === 'all' && pkg.status === 'delivered' && (pkg as IPackage & { delivered_at?: string }).delivered_at && (
													<div className="mt-1 text-[10px] text-green-600 font-bold">
														{new Date((pkg as IPackage & { delivered_at?: string }).delivered_at!).toLocaleString('ru-RU', {
															day: '2-digit',
															month: '2-digit',
															year: 'numeric',
															hour: '2-digit',
															minute: '2-digit'
														})}
													</div>
												)}
											</div>
										</div>
									)
								})}

								{visibleCount < sortedFilteredPackages.length && (
									<div className="pt-2 pb-6 flex justify-center">
										<button
											onClick={() => setVisibleCount(prev => prev + 20)}
											className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-colors"
											style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }}
										>
											Показать еще
										</button>
									</div>
								)}
							</React.Fragment>
						)}
					</div>
				</div>
			)}

			{/* === МОДАЛКА: ДОБАВИТЬ ТРЕК === */}
			<AnimatePresence>
				{showAddModal && (
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm"
					>
						<motion.div
							initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
							transition={{ type: "spring", damping: 25, stiffness: 500 }}
							className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl relative"
							style={{ backgroundColor: 'var(--tg-theme-bg-color, #ffffff)' }}
						>
							<div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>

							<div className="flex justify-between items-center mb-6">
								<h3 className="text-2xl font-black" style={{ color: 'var(--tg-theme-text-color)' }}>Новый трек</h3>
								<button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
							</div>

							<div className="space-y-4 pb-4">
								<div>
									<label className="text-xs font-bold opacity-50 uppercase ml-1" style={{ color: 'var(--tg-theme-text-color)' }}>Трек-код</label>
									<div className="relative mt-1">
										<Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
										<input
											autoFocus
											value={newTrack} onChange={e => {
												const val = e.target.value;
												setNewTrack(val);
											}}
											placeholder="CN123456789"
											className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3 font-mono font-bold text-lg outline-none focus:border-blue-500 transition-colors text-slate-900"
										/>
									</div>
								</div>
								<div>
									<label className="text-xs font-bold opacity-50 uppercase ml-1" style={{ color: 'var(--tg-theme-text-color)' }}>Описание</label>
									<input
										value={newDesc} onChange={e => setNewDesc(e.target.value)}
										placeholder="Например: Одежда"
										className="w-full mt-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-medium outline-none focus:border-blue-500 transition-colors text-slate-900"
									/>
								</div>

								<button
									onClick={handleAddTrack}
									disabled={isAdding}
									className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform flex justify-center items-center gap-2 mt-4"
								>
									{isAdding ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Добавить посылку'}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* === МОДАЛКА: КАЛЬКУЛЯТОР === */}
			<AnimatePresence>
				{showCalc && (
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
					>
						<motion.div
							initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
							className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative"
						>
							<button onClick={() => setShowCalc(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>

							<div className="text-center mb-6">
								<div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
									<Calculator size={32} />
								</div>
								<h3 className="text-xl font-black text-slate-800">Калькулятор</h3>
								<p className="text-slate-400 text-xs font-bold">Тариф: ${RATE_PER_KG} / кг</p>
							</div>

							<div className="space-y-4">
								<input
									type="number" autoFocus
									value={calcWeight} onChange={e => { setCalcWeight(e.target.value); setCalcPrice(null) }}
									placeholder="Вес (кг)"
									className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-2xl font-black text-center focus:border-red-400 outline-none text-slate-900"
								/>

								{calcPrice !== null && (
									<div className="py-4 bg-green-50 rounded-xl border border-green-100 text-center">
										<p className="text-green-600 text-xs font-bold uppercase mb-1">Стоимость доставки</p>
										<div className="text-4xl font-black text-green-700 tracking-tight">
											{calcPrice.toFixed(2)} $
										</div>
									</div>
								)}

								<button
									onClick={handleCalculate}
									className="w-full bg-red-500 text-white font-black py-4 rounded-xl shadow-lg shadow-red-200 active:scale-95 transition-transform"
								>
									Рассчитать
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* === МОДАЛКА: ЗАКАЗ ДОСТАВКИ === */}
			<AnimatePresence>
				{showDeliveryModal && (
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm"
					>
						<motion.div
							initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
							transition={{ type: "spring", damping: 25, stiffness: 500 }}
							className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
							style={{ backgroundColor: bgColor }}
						>
							<div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>

							<div className="flex justify-between items-center mb-6">
								<h3 className="text-2xl font-black" style={{ color: textColor }}>Оформление доставки</h3>
								<button onClick={() => setShowDeliveryModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
							</div>

							<div className="bg-indigo-50 p-4 rounded-xl mb-6 flex items-center justify-between border border-indigo-100">
								<div className="flex items-center gap-3">
									<Package className="text-indigo-500" size={24} />
									<span className="font-bold text-indigo-900">Выбрано посылок:</span>
								</div>
								<span className="text-xl font-black text-indigo-700">{selectedPackages.length}</span>
							</div>

							<div className="space-y-4 pb-4">
								<div>
									<label className="text-xs font-bold opacity-50 uppercase ml-1" style={{ color: textColor }}>Адрес доставки</label>
									<textarea
										value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
										placeholder="Город, Улица, Дом, Квартира"
										rows={2}
										className="w-full mt-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors text-slate-900 resize-none"
									/>
								</div>

								<div>
									<label className="text-xs font-bold opacity-50 uppercase ml-1" style={{ color: textColor }}>Телефон для связи</label>
									<input
										type="tel"
										value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)}
										placeholder="+992..."
										className="w-full mt-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors text-slate-900"
									/>
								</div>

								<div>
									<label className="text-xs font-bold opacity-50 uppercase ml-1" style={{ color: textColor }}>Комментарий курьеру (необязательно)</label>
									<input
										value={deliveryComment} onChange={e => setDeliveryComment(e.target.value)}
										placeholder="Например: Позвонить за час"
										className="w-full mt-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-medium outline-none focus:border-indigo-500 transition-colors text-slate-900"
									/>
								</div>

								<button
									onClick={handleRequestDelivery}
									disabled={isRequestingDelivery || selectedPackages.length === 0 || !deliveryAddress || !deliveryPhone}
									className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex justify-center items-center gap-2 mt-6 disabled:opacity-50 disabled:active:scale-100"
								>
									{isRequestingDelivery ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Подтвердить заказ'}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* === МОДАЛКА: ПУБЛИЧНОЕ ОТСЛЕЖИВАНИЕ === */}
			<PublicTrackingModal
				isOpen={showTrackingModal}
				onClose={() => setShowTrackingModal(false)}
			/>

			{/* === ЧАТ С МЕНЕДЖЕРОМ === */}
			{activeTab === 'chat' && (
				<ChatSection clientCode={clientCode} />
			)}

			{/* === ПРОФИЛЬ / ИНФО === */}
			{(activeTab === 'profile' || activeTab === 'stats') && (
				<div className="p-4 pt-6 animate-in fade-in slide-in-from-right-10 duration-300 pb-24">
					<h2 className="text-2xl font-black mb-6">Профиль</h2>

					<div className="bg-white rounded-3xl p-6 shadow-sm mb-6 flex flex-col items-center border border-slate-100" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #ffffff)' }}>
						<div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-500 p-1 mb-4">
							{user?.photo_url ? (
								<img src={user.photo_url} alt="Ava" className="w-full h-full rounded-full object-cover" />
							) : (
								<div className="w-full h-full bg-slate-200 rounded-full flex items-center justify-center text-slate-500 text-3xl font-black">
									{user?.first_name?.[0] || 'K'}
								</div>
							)}
						</div>
						<h3 className="text-xl font-black">{profileData.first_name || user?.first_name || 'Клиент'}</h3>
						<p className="text-sm font-bold opacity-60 mt-1 mb-4">ID Аккаунта: {clientCode}</p>

						<div className="w-full space-y-4">
							<div className="group flex flex-col items-start w-full">
								<label className="text-xs font-bold opacity-50 uppercase mb-1" style={{ color: textColor }}>ФИО</label>
								<div className="relative w-full">
									<input
										type="text"
										value={profileData.first_name}
										onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
										className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 rounded-2xl py-3 px-4 font-bold text-slate-800 outline-none transition-all"
										style={{ backgroundColor: bgColor }}
									/>
								</div>
							</div>

							<div className="group flex flex-col items-start w-full">
								<label className="text-xs font-bold opacity-50 uppercase mb-1" style={{ color: textColor }}>Номер телефона (логин)</label>
								<div className="relative w-full focus-within:scale-[1.01] transition-transform">
									<Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
									<input
										type="text"
										value={profileData.phone_number}
										onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
										className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 rounded-2xl py-3 pl-12 pr-4 font-bold text-slate-800 outline-none transition-all"
										style={{ backgroundColor: bgColor }}
									/>
								</div>
							</div>

							<div className="group flex flex-col items-start w-full">
								<label className="text-xs font-bold opacity-50 uppercase mb-1" style={{ color: textColor }}>Адрес доставки</label>
								<div className="relative w-full focus-within:scale-[1.01] transition-transform">
									<MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
									<input
										type="text"
										value={profileData.address}
										onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
										placeholder="Добавить адрес..."
										className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 rounded-2xl py-3 pl-12 pr-4 font-bold text-slate-800 outline-none transition-all"
										style={{ backgroundColor: bgColor }}
									/>
								</div>
							</div>

							<div className="flex flex-col gap-2 mt-2">
								<button
									onClick={handleSaveProfile}
									disabled={isSavingProfile}
									className="w-full bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-transform flex justify-center items-center"
								>
									{isSavingProfile ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Сохранить профиль'}
								</button>
								<button
									onClick={() => setShowPasswordModal(true)}
									className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl active:scale-95 transition-transform"
									style={{ backgroundColor: bgColor, color: textColor }}
								>
									Сменить пароль
								</button>
							</div>
						</div>
					</div>

					<h3 className="text-lg font-black mb-4">Статистика</h3>
					<div className="grid grid-cols-2 gap-3 mb-6">
						<div className="bg-blue-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
							<Package className="text-blue-500 mb-2" size={24} />
							<div className="text-2xl font-black text-blue-700">{stats.total}</div>
							<div className="text-xs font-bold text-blue-600/70 uppercase">Всего посылок</div>
						</div>
						<div className="bg-green-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
							<CheckCircle className="text-green-500 mb-2" size={24} />
							<div className="text-2xl font-black text-green-700">{stats.ready}</div>
							<div className="text-xs font-bold text-green-600/70 uppercase">Получено</div>
						</div>
						<div className="bg-purple-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
							<BarChart3 className="text-purple-500 mb-2" size={24} />
							<div className="text-2xl font-black text-purple-700">{stats.totalWeight.toFixed(1)} кг</div>
							<div className="text-xs font-bold text-purple-600/70 uppercase">Общий вес</div>
						</div>
						<div className="bg-orange-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
							<Calculator className="text-orange-500 mb-2" size={24} />
							<div className="text-2xl font-black text-orange-700">${stats.totalSpent.toFixed(2)}</div>
							<div className="text-xs font-bold text-orange-600/70 uppercase">Потрачено</div>
						</div>
					</div>

					<button
						onClick={handleSupportContact}
						className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
						style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-text-color)' }}
					>
						<MessageCircle size={20} />
						Связаться с поддержкой
					</button>

					<button
						onClick={() => {
							if (window.confirm('Вы уверены, что хотите выйти из аккаунта?')) {
								logout();
							}
						}}
						className="w-full mt-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors border border-red-100"
					>
						<LogOut size={20} />
						Выйти из аккаунта
					</button>
				</div>
			)}

			{/* === МОДАЛКА: СМЕНА ПАРОЛЯ === */}
			<AnimatePresence>
				{showPasswordModal && (
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm"
					>
						<motion.div
							initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
							transition={{ type: "spring", damping: 25, stiffness: 500 }}
							className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl relative"
							style={{ backgroundColor: 'var(--tg-theme-bg-color, #ffffff)' }}
						>
							<div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>

							<div className="flex justify-between items-center mb-6">
								<h3 className="text-2xl font-black" style={{ color: 'var(--tg-theme-text-color)' }}>Смена пароля</h3>
								<button onClick={() => setShowPasswordModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
							</div>

							<div className="space-y-4 pb-4">
								<div>
									<label className="text-xs font-bold opacity-50 uppercase ml-1" style={{ color: 'var(--tg-theme-text-color)' }}>Старый пароль</label>
									<input
										type="password"
										value={passwords.old_password} onChange={e => setPasswords({ ...passwords, old_password: e.target.value })}
										placeholder="Введите текущий пароль"
										className="w-full mt-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-medium outline-none focus:border-blue-500 transition-colors text-slate-900"
									/>
								</div>
								<div>
									<label className="text-xs font-bold opacity-50 uppercase ml-1" style={{ color: 'var(--tg-theme-text-color)' }}>Новый пароль</label>
									<input
										type="password"
										value={passwords.new_password} onChange={e => setPasswords({ ...passwords, new_password: e.target.value })}
										placeholder="Введите новый пароль"
										className="w-full mt-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-medium outline-none focus:border-blue-500 transition-colors text-slate-900"
									/>
								</div>

								<button
									onClick={handleChangePassword}
									disabled={isChangingPassword}
									className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-transform flex justify-center items-center gap-2 mt-4"
								>
									{isChangingPassword ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Подтвердить смену'}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* === МОДАЛКА: FAQ === */}
			<AnimatePresence>
				{showFAQ && (
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm"
					>
						<motion.div
							initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
							transition={{ type: "spring", damping: 25, stiffness: 500 }}
							className="bg-white w-full h-[80vh] max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl relative flex flex-col"
							style={{ backgroundColor: 'var(--tg-theme-bg-color, #ffffff)' }}
						>
							<div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0"></div>

							<div className="flex justify-between items-center mb-6 shrink-0">
								<h3 className="text-2xl font-black" style={{ color: 'var(--tg-theme-text-color)' }}>Частые вопросы</h3>
								<button onClick={() => setShowFAQ(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
							</div>

							<div className="overflow-y-auto space-y-4 pr-2 pb-10" style={{ color: 'var(--tg-theme-text-color)' }}>
								<div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
									<h4 className="font-bold mb-2 flex items-center gap-2">
										<HelpCircle size={16} className="text-blue-500" />
										Как добавить посылку?
									</h4>
									<p className="text-sm opacity-70 leading-relaxed">Нажмите кнопку «Добавить» или «+» в меню, введите трек-код, который вам дал продавец (например, из Китая), и краткое описание.</p>
								</div>

								<div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
									<h4 className="font-bold mb-2 flex items-center gap-2">
										<Clock size={16} className="text-purple-500" />
										Сколько длится доставка?
									</h4>
									<p className="text-sm opacity-70 leading-relaxed">Обычно доставка занимает от 10 до 15 дней с момента поступления на наш склад в Китае.</p>
								</div>

								<div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
									<h4 className="font-bold mb-2 flex items-center gap-2">
										<Calculator size={16} className="text-red-500" />
										Как рассчитывается стоимость?
									</h4>
									<p className="text-sm opacity-70 leading-relaxed">Стоимость рассчитывается исходя из фактического веса посылки. Текущий тариф: ${RATE_PER_KG} за 1 кг.</p>
								</div>

								<div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
									<h4 className="font-bold mb-2 flex items-center gap-2">
										<MapPin size={16} className="text-green-500" />
										Где забирать посылки?
									</h4>
									<p className="text-sm opacity-70 leading-relaxed">Как только статус изменится на «На складе», вы можете забрать её в нашем офисе.</p>
								</div>

								<div className="mt-6 pt-6 border-t border-slate-100">
									<p className="text-center text-sm font-bold opacity-60 mb-3">Остались вопросы?</p>
									<button
										onClick={() => {
											handleSupportContact();
											setShowFAQ(false);
										}}
										className="w-full bg-blue-50 text-blue-600 font-bold py-3 rounded-xl flex justify-center items-center gap-2"
									>
										<MessageCircle size={18} />
										Написать менеджеру
									</button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* === МОДАЛКА КОНТАКТОВ === */}
			<AnimatePresence>
				{showContactModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm"
						onClick={() => setShowContactModal(false)}
					>
						<motion.div
							initial={{ y: "100%" }}
							animate={{ y: 0 }}
							exit={{ y: "100%" }}
							transition={{ type: "spring", damping: 25, stiffness: 200 }}
							className="bg-white rounded-t-[2rem] p-6 pb-12 shadow-2xl relative w-full pt-4"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
							<h3 className="text-xl font-black text-gray-900 mb-6 text-center tracking-tight">Свяжитесь с нами</h3>

							<div className="flex flex-col gap-3">
								<a href="tel:+992700701212" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 active:scale-95 transition-transform text-slate-800">
									<div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shadow-inner">
										<Phone size={24} />
									</div>
									<div className="flex-1">
										<div className="font-bold text-sm">Телефон</div>
										<div className="text-xs text-slate-500 font-medium mt-0.5">+992 700 70 12 12</div>
									</div>
								</a>

								<a href="https://instagram.com/kayhon_cargo" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 active:scale-95 transition-transform text-slate-800">
									<div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center shadow-inner">
										<Instagram size={24} />
									</div>
									<div className="flex-1">
										<div className="font-bold text-sm">Инстаграм</div>
										<div className="text-xs text-slate-500 font-medium mt-0.5">@kayhon_cargo</div>
									</div>
								</a>

								<a href="https://t.me/kayhon_cargo_bot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 active:scale-95 transition-transform text-slate-800">
									<div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
										<Bot size={24} />
									</div>
									<div className="flex-1">
										<div className="font-bold text-sm">Telegram Бот</div>
										<div className="text-xs text-slate-500 font-medium mt-0.5">@kayhon_cargo_bot</div>
									</div>
								</a>

								<a href="https://t.me/kayhon_group" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 active:scale-95 transition-transform text-slate-800">
									<div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center shadow-inner">
										<Send size={24} />
									</div>
									<div className="flex-1">
										<div className="font-bold text-sm">Telegram Канал</div>
										<div className="text-xs text-slate-500 font-medium mt-0.5">https://t.me/kayhon_group</div>
									</div>
								</a>

								<button
									onClick={() => { setShowContactModal(false); setActiveTab('chat'); }}
									className="flex items-center gap-4 p-4 rounded-2xl bg-blue-600 text-white active:scale-95 transition-transform shadow-lg shadow-blue-600/30 mt-2"
								>
									<div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
										<MessageCircle size={24} />
									</div>
									<div className="flex-1 text-left">
										<div className="font-black text-sm">Написать в чат</div>
										<div className="text-xs text-blue-100 font-medium mt-0.5">Служба поддержки онлайн</div>
									</div>
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* === МОДАЛКА QR КОДА === */}
			<AnimatePresence>
				{showQrModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-md"
						onClick={() => setShowQrModal(false)}
					>
						<button className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full z-10 active:scale-90 transition-transform">
							<X size={24} />
						</button>
						<motion.div
							initial={{ scale: 0.8, y: 50 }}
							animate={{ scale: 1, y: 0 }}
							exit={{ scale: 0.8, y: 50 }}
							className="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center w-full max-w-sm relative"
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-xl font-black text-gray-900 mb-6 text-center">Ваш QR-код</h3>
							<div className="bg-white border-2 border-dashed border-gray-200 p-4 rounded-3xl mb-6 shadow-inner">
								<QRCodeComponent
									value={clientCode || ''}
									size={220}
									bgColor="#ffffff"
									fgColor="#1e3a8a"
									level="H"
								/>
							</div>
							<p className="font-black text-blue-600 text-2xl tracking-widest bg-blue-50 py-3 px-8 rounded-xl w-full text-center border border-blue-100 mb-2">
								{clientCode}
							</p>
							<p className="text-sm font-medium text-gray-500 text-center leading-snug">
								Покажите этот код администратору для быстрого поиска ваших посылок
							</p>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* === НИЖНЯЯ НАВИГАЦИЯ (DOCK) === */}
			<div
				className="fixed bottom-0 left-0 right-0 px-6 py-3 pb-6 flex justify-between items-end z-50 border-t border-gray-100/10 backdrop-blur-md bg-white/90"
				style={{ backgroundColor: bgColor }}
			>
				<button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-600' : 'text-slate-400'}`}>
					<Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
					<span className="text-[10px] font-bold">Главная</span>
				</button>

				<button onClick={() => setActiveTab('list')} className={`flex flex-col items-center gap-1 ${activeTab === 'list' ? 'text-blue-600' : 'text-slate-400'}`}>
					<List size={24} strokeWidth={activeTab === 'list' ? 2.5 : 2} />
					<span className="text-[10px] font-bold">Посылки</span>
				</button>

				{/* Центральная кнопка FAB */}
				<div className="relative -top-5">
					<button
						onClick={() => setShowAddModal(true)}
						className="w-14 h-14 bg-gradient-to-tr from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/40 active:scale-90 transition-transform border-4 border-white"
						style={{ borderColor: bgColor }}
					>
						<Plus size={28} />
					</button>
				</div>

				<button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 relative ${activeTab === 'chat' ? 'text-blue-600' : 'text-slate-400'}`}>
					<div className="relative">
						<MessageCircle size={24} strokeWidth={activeTab === 'chat' ? 2.5 : 2} />
						{unreadCount > 0 && (
							<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm pointer-events-none">
								{unreadCount > 9 ? '9+' : unreadCount}
							</span>
						)}
					</div>
					<span className="text-[10px] font-bold">Чат</span>
				</button>

				<button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 ${activeTab === 'stats' || activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400'}`}>
					<BarChart3 size={24} strokeWidth={activeTab === 'stats' || activeTab === 'profile' ? 2.5 : 2} />
					<span className="text-[10px] font-bold">Инфо</span>
				</button>
			</div>
		</div>
	);
};

export default TelegramDashboard;