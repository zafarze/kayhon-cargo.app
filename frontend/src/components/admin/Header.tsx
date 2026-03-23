// src/components/admin/Header.tsx
import { useState, useRef, useEffect } from 'react';
import {
	Search, Bell, ScanLine, FileSpreadsheet, LogOut, User,
	X, Package, Loader, ChevronRight, Clock, Menu, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ExcelModal from './ExcelModal';
import { useAuthStore } from '../../store/authStore';
import { customConfirm } from '../../utils/customConfirm';
import { api } from '../../api';
import { useTranslation } from 'react-i18next';

const getImageUrl = (path: string | null | undefined) => {
	if (!path) return null;
	if (path.startsWith('http')) return path;
	return `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}${path}`;
};

// Добавили toggleSidebar в пропсы
interface HeaderProps {
	activeTab: string;
	setActiveTab: (tab: string) => void;
	onOpenModal: () => void;
	toggleSidebar?: () => void;
}

const Header = ({ activeTab: _activeTab, setActiveTab, onOpenModal, toggleSidebar }: HeaderProps) => {
	const navigate = useNavigate();
	const logout = useAuthStore((state) => state.logout);
	const { t, i18n } = useTranslation();

	const [showExcel, setShowExcel] = useState(false);
	const [showProfileMenu, setShowProfileMenu] = useState(false);
	const [showNotifMenu, setShowNotifMenu] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [showSearchResults, setShowSearchResults] = useState(false);
	const [notifications, setNotifications] = useState<any[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [user, setUser] = useState<any | null>(null);

	const profileRef = useRef<HTMLDivElement>(null);
	const notifRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLDivElement>(null);

	const fetchData = async () => {
		try {
			const userRes = await api.get('/api/auth/me/');
			setUser(userRes.data);
			const notifRes = await api.get('/api/notifications/');
			setNotifications(notifRes.data.notifications);
			setUnreadCount(notifRes.data.unread_count);
		} catch (error) {
			console.error("Ошибка шапки", error);
		}
	};

	useEffect(() => {
		fetchData();
		const interval = setInterval(fetchData, 30000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfileMenu(false);
			if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifMenu(false);
			if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowSearchResults(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	useEffect(() => {
		const timer = setTimeout(async () => {
			if (searchQuery.length >= 2) {
				setIsSearching(true);
				try {
					const res = await api.get(`/api/search/global/?q=${searchQuery}`);
					setSearchResults(res.data);
					setShowSearchResults(true);
				} catch (error) { console.error(error); }
				finally { setIsSearching(false); }
			} else {
				setShowSearchResults(false);
				setSearchResults([]);
			}
		}, 500);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const handleResultClick = (result: any) => {
		if (result.type === 'package') {
			sessionStorage.setItem('target_search', result.title);
			navigate('/admin/packages');
		} else if (result.type === 'client') {
			sessionStorage.setItem('target_search_client', result.title);
			navigate('/admin/clients');
		}
		setShowSearchResults(false);
		setSearchQuery('');
	};

	// Аудио для уведомлений
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		// Используем звук из интернета
		audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
	}, []);

	const playNotificationSound = () => {
		if (audioRef.current) {
			audioRef.current.play().catch(e => console.error('Ошибка воспроизведения звука', e));
		}
	};

	const [prevUnreadCount, setPrevUnreadCount] = useState(0);

	useEffect(() => {
		if (unreadCount > prevUnreadCount) {
			playNotificationSound();
		}
		setPrevUnreadCount(unreadCount);
	}, [unreadCount, prevUnreadCount]);

	const handleMarkRead = async () => {
		if (unreadCount > 0) {
			try {
				await api.patch('/api/notifications/');
				setUnreadCount(0);
				setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
			} catch (e) { console.error(e) }
		}
		setShowNotifMenu(!showNotifMenu);
	};

	const handleLogout = () => {
		customConfirm('Выйти?', () => {
			logout();
			navigate('/');
		});
	};

	const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

	return (
		<header className="sticky top-0 md:top-4 z-40 mx-auto w-full mb-4 md:mb-8">
			<motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-gray-100 dark:border-slate-800 shadow-sm md:shadow-lg shadow-gray-200/50 dark:shadow-none rounded-2xl md:rounded-[2rem] p-3 md:p-4 pl-3 md:pl-8 flex justify-between items-center relative transition-colors">

				{/* ЛЕВАЯ ЧАСТЬ: Бургер (мобилка) + Текст (ПК) */}
				<div className={`flex items-center gap-4 ${isMobileSearchActive ? 'hidden md:flex' : 'flex'}`}>
					<button
						onClick={toggleSidebar}
						className="p-2 -ml-2 bg-gray-50 text-gray-600 rounded-xl block md:hidden hover:bg-gray-100"
					>
						<Menu size={24} />
					</button>
					<div className="hidden auto:block min-[400px]:block">
						<h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight transition-colors">Кабинет</h1>
						<p className="hidden md:block text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-wider">Управление</p>
					</div>
				</div>

				{/* ПРАВАЯ ЧАСТЬ: Иконки */}
				<div className={`flex items-center gap-2 md:gap-3 justify-end ${isMobileSearchActive ? 'w-full' : 'w-auto'}`}>

					{/* ПОИСК (Универсальный) */}
					<div className={`relative group ${isMobileSearchActive ? 'w-full block' : 'block'}`} ref={searchRef}>

						<div className={`md:hidden flex items-center justify-center p-2.5 rounded-full bg-gray-50 text-gray-600 active:scale-95 transition-transform ${isMobileSearchActive ? 'hidden' : 'flex'}`} onClick={() => setIsMobileSearchActive(true)}>
							<Search size={18} />
						</div>

						<div className={`flex items-center bg-gray-50/80 border transition-all rounded-full px-4 py-2.5 ${isMobileSearchActive ? 'w-full flex' : 'hidden lg:flex w-72'} ${showSearchResults ? 'bg-white border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'}`}>
							{isSearching ? <Loader size={18} className="text-blue-500 animate-spin" /> : <Search size={18} className="text-gray-400" />}
							<input
								type="text" value={searchQuery} autoFocus={isMobileSearchActive} onChange={(e) => setSearchQuery(e.target.value)}
								onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
								placeholder="Поиск..." className="bg-transparent border-none outline-none text-sm font-bold ml-3 text-gray-700 w-full"
							/>
							{searchQuery && <button onClick={() => setSearchQuery('')} className="mr-2"><X size={14} className="text-gray-400" /></button>}
							{isMobileSearchActive && <button onClick={() => { setIsMobileSearchActive(false); setShowSearchResults(false); }} className="md:hidden ml-2 pl-2 border-l border-gray-200"><X size={18} className="text-red-400" /></button>}
						</div>

						{/* Результаты поиска */}
						<AnimatePresence>
							{showSearchResults && (
								<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`absolute top-14 w-[90vw] md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2 ${isMobileSearchActive ? 'left-0 right-0 max-w-[calc(100vw-2rem)]' : 'left-0'}`}>
									{searchResults.length > 0 ? (
										<div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
											{searchResults.map((result, idx) => (
												<div key={idx} onClick={() => handleResultClick(result)} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl cursor-pointer group/item">
													<div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${result.type === 'package' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
														{result.type === 'package' ? <Package size={18} /> : <User size={18} />}
													</div>
													<div className="flex-1 overflow-hidden">
														<h4 className="font-bold text-gray-800 text-sm">{result.title}</h4>
														<p className="text-xs text-gray-400 font-medium truncate">{result.subtitle}</p>
													</div>
													<ChevronRight size={16} className="text-gray-300 group-hover/item:text-blue-500" />
												</div>
											))}
										</div>
									) : (
										<div className="p-8 text-center text-gray-400"><Search size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm font-bold">Пусто</p></div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					<div className={`h-8 w-[1px] bg-gray-200 mx-1 hidden min-[400px]:block ${isMobileSearchActive ? 'hidden' : ''}`}></div>

					<button onClick={() => setShowExcel(true)} className={`p-2.5 md:p-3 bg-white rounded-full text-green-600 hover:bg-green-50 border border-green-100 shadow-sm hidden sm:block ${isMobileSearchActive ? 'hidden' : ''}`}><FileSpreadsheet size={18} /></button>

					{/* ВЫБОР ЯЗЫКА */}
					<div className={`relative ${isMobileSearchActive ? 'hidden' : 'block'}`}>
						<select
							onChange={(e) => i18n.changeLanguage(e.target.value)}
							value={i18n.language || 'ru'}
							className="p-2.5 md:p-3 bg-white rounded-full text-sm font-bold border border-gray-100 shadow-sm outline-none cursor-pointer appearance-none text-gray-600 hover:text-blue-600 transition-colors"
						>
							<option value="ru">RU</option>
							<option value="en">EN</option>
							<option value="tj">TJ</option>
						</select>
					</div>

					{/* УВЕДОМЛЕНИЯ */}
					<div className={`relative ${isMobileSearchActive ? 'hidden' : 'block'}`} ref={notifRef}>
						<button onClick={handleMarkRead} className={`p-2.5 md:p-3 rounded-full border shadow-sm relative transition-colors ${showNotifMenu ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-100 text-gray-400 hover:text-blue-600'}`}>
							<Bell size={18} className="md:w-5 md:h-5" />
							{unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
						</button>

						<AnimatePresence>
							{showNotifMenu && (
								<motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="fixed top-[70px] left-4 right-4 sm:absolute sm:right-0 sm:left-auto sm:top-14 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
									<div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
										<h3 className="font-bold text-gray-800">Уведомления</h3>
										{unreadCount > 0 && <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">{unreadCount} новых</span>}
									</div>
									<div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto custom-scrollbar">
										{notifications.length > 0 ? (
											notifications.map((note) => (
												<div key={note.id} className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${!note.is_read ? 'bg-blue-50/30' : ''}`}>
													<p className="text-sm text-gray-700 font-medium mb-1 leading-snug break-words">{note.text}</p>
													<div className="flex items-center gap-1 text-[10px] font-bold text-gray-400"><Clock size={10} /> {note.time_ago}</div>
												</div>
											))
										) : (
											<div className="p-8 text-center text-gray-400 text-sm font-bold">Нет новых уведомлений</div>
										)}
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* ПРОФИЛЬ */}
					<div className="relative" ref={profileRef}>
						<div onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform flex items-center justify-center overflow-hidden">
							{user?.avatar ? (
								<img src={getImageUrl(user.avatar) || ''} alt="ava" className="w-full h-full object-cover" />
							) : (
								<span className="text-blue-600 font-bold">{user?.first_name?.[0]?.toUpperCase()}</span>
							)}
						</div>
						<AnimatePresence>
							{showProfileMenu && (
								<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-14 w-56 md:w-60 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2">
									<div
										onClick={() => {
											setActiveTab('settings');
											navigate('/admin/settings');
											setShowProfileMenu(false);
										}}
										className="px-4 py-3 border-b border-gray-50 mb-2 cursor-pointer hover:bg-gray-50 transition-colors"
									>
										<p className="text-sm font-bold text-gray-900 truncate">{user?.first_name}</p>
										<p className="text-xs text-gray-400 font-medium">{user?.role}</p>
									</div>
									<button onClick={() => {
										setActiveTab('settings');
										navigate('/admin/settings');
										setShowProfileMenu(false);
									}} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors text-left"><Settings size={16} /> Настройки</button>
									<button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left"><LogOut size={16} /> Выйти</button>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* КНОПКА ТЕРМИНАЛ */}
					<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onOpenModal} className="bg-gray-900 hover:bg-black text-white px-3 md:px-6 py-2.5 md:py-3 rounded-full font-bold flex items-center gap-2 shadow-xl shadow-gray-400/20 ml-1 md:ml-2">
						<ScanLine size={18} className="md:w-5 md:h-5" /> <span className="hidden sm:inline">Терминал</span>
					</motion.button>
				</div>
			</motion.div>

			<ExcelModal isOpen={showExcel} onClose={() => setShowExcel(false)} onSuccess={() => window.location.reload()} />
		</header>
	);
};

export default Header;