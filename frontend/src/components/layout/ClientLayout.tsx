// src/components/layout/ClientLayout.tsx
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Toaster } from 'react-hot-toast';
import { Truck, Box, LogOut, Menu, X, User } from 'lucide-react';
import { customConfirm } from '../../utils/customConfirm';

const ClientLayout = () => {
	const [isSidebarOpen, setSidebarOpen] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const { user, logout } = useAuthStore();

	const clientCode = user?.client_code || 'ID';

	const handleLogout = () => {
		customConfirm('Вы точно хотите выйти?', () => {
			logout();
			navigate('/auth');
		});
	};

	// --- КОМПОНЕНТ КНОПКИ МЕНЮ ---
	const NavItem = ({ to, icon, label }: any) => {
		const isActive = location.pathname === to;
		return (
			<button
				onClick={() => { navigate(to); setSidebarOpen(false); }}
				className={`relative flex items-center gap-4 w-full px-6 py-4 rounded-2xl font-bold transition-all duration-300 group overflow-hidden ${isActive
					? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
					: 'text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-md'
					}`}
			>
				{/* Блик при наведении */}
				<div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ${!isActive && 'hidden'}`}></div>

				<span className={`transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`}>
					{icon}
				</span>
				{label}
			</button>
		);
	};

	return (
		<div className="flex h-screen bg-[#F4F7FE] font-sans overflow-hidden">
			<Toaster position="top-center" containerStyle={{ zIndex: 99999 }} />

			{/* --- ЗАТЕМНЕНИЕ (МОБИЛЬНОЕ) --- */}
			{isSidebarOpen && (
				<div
					className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* --- SIDEBAR (ЛЕВЫЙ) --- */}
			<aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-[290px] bg-white flex flex-col transition-transform duration-300 ease-out shadow-2xl md:shadow-[10px_0_30px_-10px_rgba(0,0,0,0.03)]
        md:rounded-r-[2.5rem] border-r border-gray-100/50
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
				{/* ЛОГОТИП */}
				<div className="p-10 pb-8 flex justify-between items-center">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
							<Truck size={22} className="stroke-[2.5]" />
						</div>
						<div>
							<h1 className="text-2xl font-black text-gray-900 leading-none tracking-tight">Kayhon</h1>
							<p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Cargo System</p>
						</div>
					</div>
					<button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-gray-400 hover:text-gray-600"><X /></button>
				</div>

				{/* МЕНЮ */}
				<div className="flex-1 px-6 space-y-3 overflow-y-auto custom-scrollbar">
					<p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 opacity-50">Меню</p>

					<NavItem to={`/dashboard/${clientCode}`} icon={<Box size={20} />} label="Мои посылки" />

					{/* ДОБАВЛЕННАЯ КНОПКА ПРОФИЛЯ */}
					<NavItem to={`/dashboard/${clientCode}/profile`} icon={<User size={20} />} label="Мой профиль" />

					{/* Баннер "Мой код" в сайдбаре */}
					<div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group">
						<div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
						<p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Ваш ID код</p>
						<div className="text-2xl font-black tracking-wider font-mono text-blue-400">{clientCode}</div>
					</div>
				</div>

				{/* НИЗ САЙДБАРА */}
				<div className="p-8">
					<button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 font-bold text-sm transition-all group">
						<LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
						<span>Выйти</span>
					</button>
				</div>
			</aside>

			{/* --- MAIN CONTENT --- */}
			<div className="flex-1 flex flex-col h-screen overflow-hidden relative">

				{/* --- КОНТЕНТ СТРАНИЦЫ --- */}
				<main className="flex-1 overflow-y-auto pb-10 custom-scrollbar">
					<div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
						<Outlet context={{ toggleSidebar: () => setSidebarOpen(!isSidebarOpen) }} />
					</div>
				</main>

			</div>
		</div>
	);
};

export default ClientLayout;