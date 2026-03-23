// src/pages/client/ClientProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Save, ShieldCheck, Key, X } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import Header from '../../components/client/Header';

const ClientProfilePage = () => {
	const { clientCode } = useParams<{ clientCode: string }>();
	// Получаем функцию открытия мобильного меню из ClientLayout
	const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>() || { toggleSidebar: () => { } };

	const [userData, setUserData] = useState({ first_name: '', phone_number: '', address: '' });
	const [loading, setLoading] = useState(false);

	// Состояния для смены пароля
	const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
	const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
	const [passwordLoading, setPasswordLoading] = useState(false);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const res = await api.get('/api/auth/me/');
				setUserData({
					first_name: res.data.first_name || '',
					phone_number: res.data.phone_number || res.data.username || '',
					address: res.data.address || '',
				});
			} catch (err) {
				console.error("Ошибка загрузки профиля:", err);
			}
		};
		fetchProfile();
	}, []);

	const handleSave = async () => {
		setLoading(true);
		try {
			await api.patch('/api/auth/me/', userData);
			toast.success('Данные успешно сохранены!', { icon: '✅' });
		} catch {
			toast.error('Ошибка при сохранении данных');
		} finally {
			setLoading(false);
		}
	};

	const handleChangePassword = async () => {
		if (!passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password) {
			toast.error('Заполните все поля');
			return;
		}
		if (passwordData.new_password !== passwordData.confirm_password) {
			toast.error('Новые пароли не совпадают');
			return;
		}

		setPasswordLoading(true);
		try {
			await api.post('/api/auth/change-password/', {
				old_password: passwordData.old_password,
				new_password: passwordData.new_password
			});
			toast.success('Пароль успешно изменен');
			setPasswordModalOpen(false);
			setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
		} catch (err: unknown) {
			const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка при смене пароля';
			toast.error(errorMsg);
		} finally {
			setPasswordLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F4F7FE] font-sans text-slate-800">
			{/* Шапка */}
			<Header
				user={{ first_name: userData.first_name || "Клиент", client_code: clientCode || "" }}
				greeting="Настройки профиля"
				toggleSidebar={toggleSidebar}
			/>

			<div className="max-w-[1600px] mx-auto pb-24 px-4 md:px-6">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="max-w-3xl mx-auto space-y-8"
				>
					{/* Блок с Кодом и статусом */}
					<div className="bg-[#1E293B] rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
						<div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -mt-20 -mr-20 pointer-events-none"></div>

						<div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-[1.5rem] flex items-center justify-center text-4xl font-black shadow-lg shadow-blue-500/30 shrink-0 relative z-10 border-4 border-white/10">
							{userData.first_name ? userData.first_name[0].toUpperCase() : 'C'}
						</div>

						<div className="relative z-10 mt-2 sm:mt-0 flex-1">
							<h2 className="text-3xl font-black tracking-tight">{userData.first_name || 'Загрузка...'}</h2>
							<div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
								<span className="bg-white/10 text-white px-4 py-1.5 rounded-xl font-mono font-bold text-sm backdrop-blur-sm border border-white/10 flex items-center gap-2">
									ID: <span className="text-blue-300">{clientCode}</span>
								</span>
								<span className="flex items-center gap-1.5 text-green-400 text-xs font-bold bg-green-400/10 px-3 py-1.5 rounded-xl">
									<ShieldCheck size={16} /> Аккаунт активен
								</span>
							</div>
						</div>
					</div>

					{/* Форма редактирования */}
					<div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
						<h3 className="text-xl font-black text-slate-800 mb-6">Личные данные</h3>

						<div className="space-y-5">
							<div className="group">
								<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 tracking-wider">Ваше имя</label>
								<div className="relative focus-within:scale-[1.01] transition-transform">
									<User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
									<input
										type="text"
										value={userData.first_name}
										onChange={(e) => setUserData({ ...userData, first_name: e.target.value })}
										className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-800 outline-none transition-all shadow-sm"
									/>
								</div>
							</div>

							<div className="group">
								<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 tracking-wider">Номер телефона</label>
								<div className="relative focus-within:scale-[1.01] transition-transform">
									<Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
									<input
										type="text"
										value={userData.phone_number}
										onChange={(e) => setUserData({ ...userData, phone_number: e.target.value })}
										className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-800 outline-none transition-all shadow-sm"
									/>
								</div>
							</div>

							<div className="group">
								<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 tracking-wider">Адрес</label>
								<div className="relative focus-within:scale-[1.01] transition-transform">
									<ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
									<input
										type="text"
										value={userData.address}
										onChange={(e) => setUserData({ ...userData, address: e.target.value })}
										placeholder="Добавить адрес..."
										className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-800 outline-none transition-all shadow-sm"
									/>
								</div>
							</div>
						</div>

						<div className="mt-8 flex gap-4">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={handleSave}
								disabled={loading}
								className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
							>
								{loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : <><Save size={20} /> Сохранить изменения</>}
							</motion.button>
						</div>
					</div>

					{/* Смена пароля */}
					<div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
						<div>
							<h3 className="text-lg font-black text-slate-800">Безопасность</h3>
							<p className="text-slate-400 text-sm font-medium mt-1">Рекомендуем обновлять пароль раз в 3 месяца</p>
						</div>
						<button onClick={() => setPasswordModalOpen(true)} className="w-full sm:w-auto p-4 px-6 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-bold transition-colors flex items-center justify-center gap-2 border border-slate-200">
							<Key size={18} /> <span>Сменить пароль</span>
						</button>
					</div>

				</motion.div>
			</div>

			{/* Модалка смены пароля */}
			<AnimatePresence>
				{isPasswordModalOpen && (
					<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative"
						>
							<button onClick={() => setPasswordModalOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
								<X size={20} />
							</button>

							<div className="flex items-center gap-4 mb-6">
								<div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
									<Key size={24} />
								</div>
								<div>
									<h2 className="text-xl font-black text-slate-800">Смена пароля</h2>
									<p className="text-sm font-medium text-slate-400">Введите старый и новый пароли</p>
								</div>
							</div>

							<div className="space-y-4">
								<div>
									<label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Текущий пароль</label>
									<input
										type="password"
										value={passwordData.old_password}
										onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })}
										className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none transition-all"
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Новый пароль</label>
									<input
										type="password"
										value={passwordData.new_password}
										onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
										className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none transition-all"
									/>
								</div>
								<div>
									<label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Повторите новый пароль</label>
									<input
										type="password"
										value={passwordData.confirm_password}
										onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
										className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none transition-all"
									/>
								</div>
							</div>

							<button
								onClick={handleChangePassword}
								disabled={passwordLoading}
								className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
							>
								{passwordLoading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : 'Сохранить новый пароль'}
							</button>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default ClientProfilePage;
