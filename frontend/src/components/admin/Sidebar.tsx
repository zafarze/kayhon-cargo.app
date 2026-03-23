// src/components/admin/Sidebar.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
	LayoutGrid, Users, Package, BarChart3, LogOut,
	Truck, ShieldCheck, ChevronLeft, ChevronRight, X, Settings, Sliders, ShieldAlert, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { customConfirm } from '../../utils/customConfirm';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
	isCollapsed: boolean;       // Для ПК
	toggleSidebar: () => void;  // Переключатель
}

const Sidebar = ({ isCollapsed, toggleSidebar }: SidebarProps) => {
	const navigate = useNavigate();
	const location = useLocation();
	const logout = useAuthStore((state) => state.logout);

	// Определяем, мобильное ли устройство (ширина меньше 768px)
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

	const { t } = useTranslation();

	useEffect(() => {
		const handleResize = () => setIsMobile(window.innerWidth < 768);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const handleLogout = () => {
		customConfirm(t('sidebar.confirmLogout', 'Вы точно хотите выйти?'), () => {
			logout();
			navigate('/');
		});
	};

	const isActive = (path: string) => location.pathname.includes(path);

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

	// Варианты анимации ТОЛЬКО для десктопа
	const desktopVariants = {
		expanded: { width: "260px", transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
		collapsed: { width: "80px", transition: { type: "spring" as const, stiffness: 300, damping: 30 } }
	};

	// Варианты анимации для мобилки (Drawer)
	const mobileVariants = {
		expanded: { x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
		collapsed: { x: "-100%", transition: { type: "spring" as const, stiffness: 300, damping: 30 } }
	};

	return (
		<>
			{/* ТЕМНЫЙ ФОН ДЛЯ МОБИЛОК (показываем только если меню открыто на телефоне) */}
			<AnimatePresence>
				{isMobile && !isCollapsed && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={toggleSidebar}
						className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
					/>
				)}
			</AnimatePresence>

			<motion.aside
				initial={isMobile ? "collapsed" : "expanded"}
				animate={isCollapsed ? "collapsed" : "expanded"}
				variants={isMobile ? mobileVariants : desktopVariants}
				// На мобилке position: fixed и полная высота, на ПК остается отступ сверху
				className={`fixed top-0 md:top-4 left-0 h-full md:h-[calc(100vh-32px)] bg-white dark:bg-slate-900 z-50 flex flex-col shadow-2xl shadow-blue-900/10 md:border md:border-slate-100 dark:md:border-slate-800 md:rounded-[2rem] md:ml-4 overflow-visible
					${isMobile ? 'w-[280px] rounded-r-3xl rounded-l-none border-r border-slate-100 dark:border-slate-800' : ''}
				`}
			>
				{/* КНОПКА ЗАКРЫТИЯ (КРЕСТИК) ДЛЯ МОБИЛОК */}
				{isMobile && (
					<button
						onClick={toggleSidebar}
						className="absolute top-6 right-4 p-2 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-100 md:hidden"
					>
						<X size={20} />
					</button>
				)}

				{/* КНОПКА СВОРАЧИВАНИЯ ДЛЯ ПК */}
				{!isMobile && (
					<button
						onClick={toggleSidebar}
						className="absolute -right-3 top-9 w-7 h-7 bg-white border border-slate-100 rounded-full shadow-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer outline-none"
					>
						{isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
					</button>
				)}

				{/* ЛОГОТИП */}
				<div className={`pt-10 md:pt-8 pb-4 flex flex-col items-center transition-all duration-300 ${isCollapsed && !isMobile ? 'px-0' : 'px-6'}`}>
					<motion.div
						layout
						className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-2 cursor-pointer"
						onClick={() => { navigate('/admin/dashboard'); if (isMobile) toggleSidebar(); }}
					>
						<Truck size={24} />
					</motion.div>

					<AnimatePresence mode='wait'>
						{(!isCollapsed || isMobile) && (
							<motion.div
								initial={{ opacity: 0, height: 0, scale: 0.8 }}
								animate={{ opacity: 1, height: 'auto', scale: 1 }}
								exit={{ opacity: 0, height: 0, scale: 0.8 }}
								className="text-center overflow-hidden whitespace-nowrap"
							>
								<h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none mb-0.5">Kayhon</h1>
								<p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cargo System</p>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* МЕНЮ */}
				<nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-2 custom-scrollbar">
					<NavItem isMobile={isMobile} isCollapsed={isCollapsed} icon={<LayoutGrid size={20} />} label={t('sidebar.dashboard', 'Дашборд')} active={isActive('dashboard')} onClick={() => { navigate('/admin/dashboard'); if (isMobile) toggleSidebar(); }} />
					<NavItem isMobile={isMobile} isCollapsed={isCollapsed} icon={<Package size={20} />} label={t('sidebar.packages', 'Все посылки')} active={isActive('packages')} onClick={() => { navigate('/admin/packages'); if (isMobile) toggleSidebar(); }} />
					<NavItem isMobile={isMobile} isCollapsed={isCollapsed} icon={<Truck size={20} />} label={t('sidebar.delivery', 'Доставка')} active={isActive('delivery')} onClick={() => { navigate('/admin/delivery'); if (isMobile) toggleSidebar(); }} />
					<NavItem isMobile={isMobile} isCollapsed={isCollapsed} icon={<BarChart3 size={20} />} label={t('sidebar.finance', 'Финансы')} active={isActive('finance')} onClick={() => { navigate('/admin/finance'); if (isMobile) toggleSidebar(); }} />
					<NavItem isMobile={isMobile} isCollapsed={isCollapsed} icon={<Users size={20} />} label={t('sidebar.clients', 'Клиенты')} active={isActive('clients')} onClick={() => { navigate('/admin/clients'); if (isMobile) toggleSidebar(); }} />
					<NavItem isMobile={isMobile} isCollapsed={isCollapsed} icon={<ShieldCheck size={20} />} label={t('sidebar.users', 'Сотрудники')} active={isActive('users')} onClick={() => { navigate('/admin/users'); if (isMobile) toggleSidebar(); }} />
					<NavItem isMobile={isMobile} isCollapsed={isCollapsed} icon={<ShieldAlert size={20} />} label={t('sidebar.prohibited', 'Декларатсия')} active={isActive('prohibited')} onClick={() => { navigate('/admin/prohibited'); if (isMobile) toggleSidebar(); }} />
					<NavItem isMobile={isMobile} isCollapsed={isCollapsed} icon={<Settings size={20} />} label={t('sidebar.settings', 'Настройки')} active={isActive('settings')} onClick={() => { navigate('/admin/settings'); if (isMobile) toggleSidebar(); }} />
				</nav>

				{/* НИЖНИЙ БЛОК (ВЫХОД & PWA) */}
				<div className="p-3 mt-2 mb-4 md:mb-2 flex flex-col gap-2">

					{!isStandalone && (deferredPrompt || isIOS) && (
						<button
							onClick={handleInstallClick}
							className={`flex items-center justify-center gap-3 w-full py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all group overflow-hidden whitespace-nowrap ${(isCollapsed && !isMobile) ? 'px-0' : 'px-4'}`}
							title="Установить приложение"
						>
							<Smartphone size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform shrink-0" />
							<AnimatePresence>
								{(!isCollapsed || isMobile) && (
									<motion.span
										initial={{ opacity: 0, width: 0 }}
										animate={{ opacity: 1, width: 'auto' }}
										exit={{ opacity: 0, width: 0 }}
										className="text-sm"
									>
										{t('sidebar.installApp', 'Установить App')}
									</motion.span>
								)}
							</AnimatePresence>
						</button>
					)}

					<button
						onClick={handleLogout}
						className={`flex items-center justify-center gap-3 w-full py-3 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all group overflow-hidden whitespace-nowrap ${(isCollapsed && !isMobile) ? 'px-0' : 'px-4 bg-red-50/50'}`}
						title={t('sidebar.logout', 'Выйти')}
					>
						<LogOut size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform shrink-0" />
						<AnimatePresence>
							{(!isCollapsed || isMobile) && (
								<motion.span
									initial={{ opacity: 0, width: 0 }}
									animate={{ opacity: 1, width: 'auto' }}
									exit={{ opacity: 0, width: 0 }}
									className="text-sm"
								>
									{t('sidebar.logout', 'Выйти')}
								</motion.span>
							)}
						</AnimatePresence>
					</button>
				</div>
			</motion.aside>
		</>
	);
};

// Компонент кнопки меню
const NavItem = ({ icon, label, active, onClick, isCollapsed, isMobile }: any) => (
	<button
		onClick={onClick}
		className={`relative flex items-center w-full py-3 rounded-2xl font-bold transition-all duration-300 group overflow-hidden whitespace-nowrap outline-none
			${active
				? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
				: 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600'
			}
			${(isCollapsed && !isMobile) ? 'justify-center px-0' : 'px-4 gap-3'}
		`}
		title={(isCollapsed && !isMobile) ? label : undefined}
	>
		<span className={`transition-transform duration-300 shrink-0 ${active ? 'scale-100' : 'group-hover:scale-110'}`}>
			{icon}
		</span>
		<AnimatePresence>
			{(!isCollapsed || isMobile) && (
				<motion.span
					initial={{ opacity: 0, width: 0, x: -10 }}
					animate={{ opacity: 1, width: 'auto', x: 0 }}
					exit={{ opacity: 0, width: 0, x: -10 }}
					transition={{ duration: 0.2 }}
					className="text-[13px] truncate"
				>
					{label}
				</motion.span>
			)}
		</AnimatePresence>
		{(isCollapsed && !isMobile) && active && (
			<motion.div layoutId="activeDot" className="absolute right-2 top-2 w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
		)}
	</button>
);

export default Sidebar;