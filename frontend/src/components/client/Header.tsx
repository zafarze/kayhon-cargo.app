// src/components/client/Header.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, QrCode, Menu, User, X, Info, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuthStore } from '../../store/authStore';

interface HeaderProps {
	user?: { first_name: string; client_code: string };
	greeting?: string;
	onOpenQr?: () => void;
	onSearch?: (query: string) => void;
	toggleSidebar?: () => void;
}

const Header = ({ user, greeting, onOpenQr, onSearch, toggleSidebar }: HeaderProps) => {
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const [searchValue, setSearchValue] = useState('');

	// --- СТЕЙТЫ УВЕДОМЛЕНИЙ ---
	const [notifications, setNotifications] = useState<any[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isNotifOpen, setIsNotifOpen] = useState(false);
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const notifRef = useRef<HTMLDivElement>(null);
	const profileRef = useRef<HTMLDivElement>(null);

	const navigate = useNavigate();
	const logout = useAuthStore(state => state.logout);

	// --- ЗАГРУЗКА УВЕДОМЛЕНИЙ ---
	const fetchNotifications = async () => {
		try {
			const res = await api.get('/api/notifications/');
			setNotifications(res.data.notifications);
			setUnreadCount(res.data.unread_count);
		} catch (error) {
			console.error("Ошибка загрузки уведомлений:", error);
		}
	};

	// Загружаем при старте и каждые 30 секунд
	useEffect(() => {
		fetchNotifications();
		const interval = setInterval(fetchNotifications, 30000);
		return () => clearInterval(interval);
	}, []);

	// --- ОТКРЫТИЕ МЕНЮ И ПРОЧТЕНИЕ ---
	const toggleNotifications = async () => {
		setIsNotifOpen(!isNotifOpen);
		// Если мы открываем панель и есть непрочитанные - помечаем их на сервере
		if (!isNotifOpen && unreadCount > 0) {
			try {
				await api.patch('/api/notifications/');
				setUnreadCount(0); // Сбрасываем счетчик локально сразу
			} catch (error) {
				console.error("Ошибка обновления статуса:", error);
			}
		}
	};

	// Закрытие по клику вне окна
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
				setIsNotifOpen(false);
			}
			if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
				setIsProfileOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleLogout = () => {
		logout();
		navigate('/');
	};

	// --- ПОИСК ---
	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setSearchValue(val);
		if (onSearch) onSearch(val);
	};

	const clearSearch = () => {
		setSearchValue('');
		if (onSearch) onSearch('');
	};

	return (
		<header className="sticky top-4 z-40 w-full max-w-[1600px] mx-auto px-4 md:px-6 mb-4 md:mb-8">
			<motion.div
				initial={{ y: -30, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.6, type: "spring" }}
				// ВАЖНО: Убрали overflow-hidden отсюда, чтобы меню могло выпадать
				className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-lg shadow-slate-200/40 rounded-[2rem] p-3 pl-4 md:pl-6 pr-3 flex justify-between items-center relative min-h-[70px]"
			>
				{/* --- ФОНОВЫЙ БЛИК --- */}
				{/* Добавили rounded-t-[2rem], чтобы блик не вылезал за верхние углы */}
				<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-purple-500/0 opacity-50 rounded-t-[2rem]"></div>

				{/* 1. ЛЕВАЯ ЧАСТЬ */}
				<div className="flex items-center gap-4">
					<button onClick={toggleSidebar} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
						<Menu size={24} />
					</button>
					<div className="hidden md:block">
						<h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
							{greeting}, <span className="text-blue-600">{user?.first_name}</span> 👋
						</h1>
					</div>
				</div>

				{/* 2. ЦЕНТР (ПОИСК) */}
				<div className="hidden md:flex flex-1 justify-center px-6 relative z-10">
					<div className={`flex items-center bg-slate-100/50 border border-transparent hover:border-blue-200 focus-within:bg-white focus-within:border-blue-300 focus-within:shadow-xl focus-within:shadow-blue-100/50 rounded-2xl px-4 py-2.5 transition-all duration-300 group w-full max-w-md ${isSearchFocused ? 'max-w-xl' : ''}`}>
						<Search size={18} className={`mr-3 transition-colors ${isSearchFocused ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
						<input
							id="desktop-search"
							type="text"
							placeholder="Поиск посылки..."
							className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 w-full placeholder:text-slate-400"
							onFocus={() => setIsSearchFocused(true)}
							onBlur={() => setIsSearchFocused(false)}
							value={searchValue}
							onChange={handleSearch}
						/>
						{searchValue && <button onClick={clearSearch} className="text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button>}
					</div>
				</div>

				{/* 3. ПРАВАЯ ЧАСТЬ */}
				<div className="flex items-center gap-2 md:gap-3 relative z-10">
					<motion.button
						whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
						onClick={onOpenQr}
						className="hidden md:flex items-center gap-2 bg-slate-900 text-white pl-4 pr-5 py-2.5 rounded-full font-bold text-sm shadow-xl shadow-slate-300 hover:bg-black transition-all group"
					>
						<QrCode size={18} className="group-hover:rotate-90 transition-transform duration-500" />
						<span>QR Код</span>
					</motion.button>

					<button onClick={onOpenQr} className="md:hidden p-2.5 bg-slate-900 text-white rounded-full shadow-lg active:scale-95 transition-transform">
						<QrCode size={18} />
					</button>

					<div className="h-6 w-[1px] bg-slate-200 mx-1 hidden md:block"></div>

					{/* === УВЕДОМЛЕНИЯ === */}
					<div className="relative" ref={notifRef}>
						<button
							onClick={toggleNotifications}
							className="p-2.5 md:p-3 bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full border border-slate-100 shadow-sm transition-all group focus:outline-none"
						>
							<Bell size={20} className={unreadCount > 0 ? "group-hover:swing animate-bounce duration-1000" : "group-hover:swing"} />
						</button>

						{/* Индикатор непрочитанных */}
						{unreadCount > 0 && (
							<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-md">
								{unreadCount}
							</span>
						)}

						{/* Выпадающее меню уведомлений */}
						<AnimatePresence>
							{isNotifOpen && (
								<motion.div
									initial={{ opacity: 0, y: 15, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: 10, scale: 0.95 }}
									transition={{ duration: 0.2 }}
									className="absolute right-0 top-14 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 origin-top-right"
								>
									<div className="bg-slate-900 px-5 py-4 text-white flex justify-between items-center">
										<h3 className="font-bold text-sm">Уведомления</h3>
										{unreadCount > 0 && (
											<span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Новых: {unreadCount}</span>
										)}
									</div>

									<div className="max-h-[320px] overflow-y-auto custom-scrollbar bg-slate-50/50">
										{notifications.length === 0 ? (
											<div className="p-8 text-center text-slate-400">
												<Bell size={32} className="mx-auto mb-2 opacity-20" />
												<p className="text-xs font-bold uppercase tracking-wider">Нет уведомлений</p>
											</div>
										) : (
											<div className="divide-y divide-slate-100">
												{notifications.map((notif) => (
													<div key={notif.id} className={`p-4 transition-colors hover:bg-slate-50 flex gap-3 ${!notif.is_read ? 'bg-blue-50/30' : 'bg-white'}`}>
														<div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
															<Info size={14} />
														</div>
														<div>
															<p className="text-sm font-medium text-slate-800 leading-snug">{notif.text}</p>
															<span className="text-[10px] font-bold text-slate-400 mt-1 block uppercase tracking-wider">
																{notif.time_ago}
															</span>
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Профиль */}
					<div className="pl-1 relative" ref={profileRef}>
						<div
							onClick={() => setIsProfileOpen(!isProfileOpen)}
							className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 p-[2px] cursor-pointer hover:scale-105 transition-transform shadow-md relative z-10"
						>
							<div className="w-full h-full bg-white rounded-full flex items-center justify-center text-blue-700 font-black text-xs md:text-sm border-2 border-white">
								{user?.first_name ? user.first_name[0].toUpperCase() : <User size={18} />}
							</div>
						</div>

						<AnimatePresence>
							{isProfileOpen && (
								<motion.div
									initial={{ opacity: 0, y: 10, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: 10, scale: 0.95 }}
									transition={{ duration: 0.2 }}
									className="absolute right-0 top-14 w-56 md:w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 p-2 origin-top-right"
								>
									<div
										onClick={() => {
											navigate(`/dashboard/${user?.client_code}/profile`);
											setIsProfileOpen(false);
										}}
										className="px-4 py-3 border-b border-slate-50 mb-2 cursor-pointer hover:bg-slate-50 transition-colors"
									>
										<p className="text-sm font-bold text-slate-900 truncate">{user?.first_name || 'Клиент'}</p>
										<p className="text-xs text-slate-400 font-medium truncate">{user?.client_code || '---'}</p>
									</div>
									<button
										onClick={() => {
											navigate(`/dashboard/${user?.client_code}/profile`);
											setIsProfileOpen(false);
										}}
										className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left"
									>
										<Settings size={16} /> Настройки
									</button>
									<button
										onClick={handleLogout}
										className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left"
									>
										<LogOut size={16} /> Выйти
									</button>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</motion.div>
		</header>
	);
};

export default Header;