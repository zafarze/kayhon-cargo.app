import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../admin/Sidebar';
import Header from '../admin/Header';
import ScannerTerminal from '../admin/ScannerTerminal'; // 👈 ИМПОРТИРОВАЛИ ТЕРМИНАЛ
import ChatWidget from '../admin/ChatWidget'; // 👈 ИМПОРТИРОВАЛИ WIDGET

const AdminLayout = () => {
	const location = useLocation();

	// Состояния для мобилки и сайдбара
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
	const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 768);

	// 👈 СОСТОЯНИЕ ДЛЯ ТЕРМИНАЛА
	const [isTerminalOpen, setIsTerminalOpen] = useState(false);

	useEffect(() => {
		const handleResize = () => {
			const mobile = window.innerWidth < 768;
			setIsMobile(mobile);
			if (mobile) setIsCollapsed(true);
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	useEffect(() => {
		if (isMobile) {
			setIsCollapsed(true);
		}
	}, [location.pathname, isMobile]);

	return (
		<div className="min-h-screen bg-[#F4F7FC] dark:bg-slate-950 dark:text-gray-100 flex font-sans overflow-x-hidden transition-colors">

			<Sidebar
				isCollapsed={isCollapsed}
				toggleSidebar={() => setIsCollapsed(!isCollapsed)}
			/>

			<main
				className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out w-full
                    ${isMobile ? 'ml-0' : (isCollapsed ? 'ml-[100px]' : 'ml-[290px]')}
                `}
			>
				<div className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col">

					<Header
						toggleSidebar={() => setIsCollapsed(!isCollapsed)}
						activeTab="dashboard"
						setActiveTab={() => { }}
						// 👈 ПЕРЕДАЕМ ФУНКЦИЮ ОТКРЫТИЯ В ШАПКУ
						onOpenModal={() => setIsTerminalOpen(true)}
					/>

					<div className="flex-1 mt-2 md:mt-4">
						<Outlet />
					</div>

				</div>
			</main>

			{/* 👈 ДОБАВЛЯЕМ КОМПОНЕНТ ТЕРМИНАЛА В САМЫЙ КОРЕНЬ */}
			<ScannerTerminal
				isOpen={isTerminalOpen}
				onClose={() => setIsTerminalOpen(false)}
				onSuccess={() => {
					setIsTerminalOpen(false);
					// Здесь можно добавить функцию перезагрузки данных, если нужно
				}}
			/>

			<ChatWidget />
		</div>
	);
};

export default AdminLayout;