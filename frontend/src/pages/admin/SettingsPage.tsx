// src/pages/admin/SettingsPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Shield, Smartphone, Save, Key, Loader, Camera, X, Bell, Volume2, Moon, Sun, Monitor } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

const getImageUrl = (path: string | null | undefined) => {
	if (!path) return null;
	if (path.startsWith('http')) return path;
	const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
	return `${API_URL}${path}`;
};

interface UserProfile {
	id: number;
	username: string;
	first_name: string;
	email: string;
	role: string;
	avatar?: string | null;
	phone_number?: string;
	address?: string;
	client_code?: string;
}

const SettingsPage = () => {
	const [user, setUser] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	const [formData, setFormData] = useState({ first_name: '', email: '', phone_number: '', address: '' });
	const [soundEnabled, setSoundEnabled] = useState(true);
	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const { theme, setTheme } = useTheme();

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [photoFile, setPhotoFile] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);

	const [showPassModal, setShowPassModal] = useState(false);
	const [passData, setPassData] = useState({ old_password: '', new_password: '' });
	const [isPassSaving, setIsPassSaving] = useState(false);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const res = await api.get('/api/auth/me/');
				setUser(res.data);
				setFormData({
					first_name: res.data.first_name || '',
					email: res.data.email || '',
					phone_number: res.data.phone_number || '',
					address: res.data.address || ''
				});
				if (res.data.avatar) setPhotoPreview(getImageUrl(res.data.avatar));

				// Загружаем настройки звука из localStorage
				const savedSound = localStorage.getItem('soundEnabled');
				if (savedSound !== null) setSoundEnabled(savedSound === 'true');

				const savedNotif = localStorage.getItem('notificationsEnabled');
				if (savedNotif !== null) setNotificationsEnabled(savedNotif === 'true');

			} catch (error) {
				console.error("Ошибка загрузки профиля", error);
				toast.error("Не удалось загрузить данные");
			} finally {
				setLoading(false);
			}
		};
		fetchProfile();
	}, []);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setPhotoFile(file);
			setPhotoPreview(URL.createObjectURL(file));
		}
	};

	const handleSave = async () => {
		if (!formData.first_name.trim()) return toast.error('Имя обязательно!');
		setIsSaving(true);
		const toastId = toast.loading('Сохранение...');

		try {
			const payload = new FormData();
			payload.append('first_name', formData.first_name);
			payload.append('email', formData.email);
			payload.append('phone_number', formData.phone_number);
			payload.append('address', formData.address);
			if (photoFile) payload.append('avatar', photoFile);

			const res = await api.patch('/api/auth/me/', payload, {
				headers: { 'Content-Type': 'multipart/form-data' }
			});

			setUser(res.data);

			// Сохраняем настройки в localStorage
			localStorage.setItem('soundEnabled', String(soundEnabled));
			localStorage.setItem('notificationsEnabled', String(notificationsEnabled));

			window.dispatchEvent(new Event('profileUpdated'));
			toast.success('Сохранено!', { id: toastId });
		} catch (error: any) {
			toast.error(error.response?.data?.detail || "Ошибка", { id: toastId });
		} finally {
			setIsSaving(false);
		}
	};

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (passData.new_password.length < 6) return toast.error("Пароль слишком короткий");
		setIsPassSaving(true);
		try {
			await api.post('/api/auth/change-password/', passData);
			toast.success('Пароль изменен');
			setShowPassModal(false);
			setPassData({ old_password: '', new_password: '' });
		} catch (err: any) {
			toast.error(err.response?.data?.error || "Ошибка смены пароля");
		} finally {
			setIsPassSaving(false);
		}
	};

	if (loading) return <div className="p-10 text-center text-gray-400 font-bold">Загрузка настроек...</div>;

	return (
		<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-5xl mx-auto pb-10 pt-4">
			<div>
				<h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Настройки</h1>
				<p className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-wider mt-1">Персональные данные и система</p>
			</div>

			<div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-10 items-start relative overflow-hidden transition-colors">
				<div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>

				<div className="flex flex-col items-center gap-6 w-full md:w-auto relative z-10">
					<input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleFileChange} />
					<div onClick={() => fileInputRef.current?.click()} className="group relative w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-gray-100 cursor-pointer overflow-hidden shadow-xl shadow-gray-200 border-4 border-white transition-transform hover:scale-105">
						{photoPreview ? (
							<img src={photoPreview} alt="Ava" className="w-full h-full object-cover" />
						) : (
							<div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-300">{user?.first_name?.[0]}</div>
						)}
						<div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
							<Camera size={24} />
							<span className="text-[10px] font-bold mt-1">Сменить</span>
						</div>
					</div>
					<div className="text-center">
						<h2 className="text-xl font-black text-gray-900 dark:text-white">{user?.first_name}</h2>
						<div className="inline-flex items-center gap-1 mt-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-900/50 rounded-full text-[10px] font-bold uppercase">
							<Shield size={10} /> {user?.role}
						</div>
					</div>
				</div>

				<div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
					<div className="space-y-2">
						<label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase ml-2">Имя</label>
						<div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-center focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-blue-300 dark:focus-within:border-blue-500/50 transition-colors">
							<User size={18} className="text-gray-400 dark:text-gray-500 mr-3" />
							<input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="bg-transparent outline-none w-full font-bold text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-600" placeholder="Ваше имя" />
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase ml-2">Логин</label>
						<div className="bg-gray-100 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 rounded-2xl px-4 py-3 flex items-center opacity-60">
							<Smartphone size={18} className="text-gray-400 dark:text-gray-500 mr-3" />
							<input value={user?.username || ''} readOnly className="bg-transparent outline-none w-full font-bold text-gray-500 dark:text-gray-400 cursor-not-allowed" />
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase ml-2">Номер телефона</label>
						<div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-center focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-blue-300 dark:focus-within:border-blue-500/50 transition-colors">
							<Smartphone size={18} className="text-gray-400 dark:text-gray-500 mr-3" />
							<input type="tel" value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} className="bg-transparent outline-none w-full font-bold text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-600" placeholder="+992..." />
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase ml-2">Email</label>
						<div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-center focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-blue-300 dark:focus-within:border-blue-500/50 transition-colors">
							<Mail size={18} className="text-gray-400 dark:text-gray-500 mr-3" />
							<input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="bg-transparent outline-none w-full font-bold text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-600" placeholder="pochta@example.com" />
						</div>
					</div>

					<div className="col-span-1 md:col-span-2 space-y-2">
						<label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase ml-2">Адрес для доставки</label>
						<div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-start focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-blue-300 dark:focus-within:border-blue-500/50 transition-colors">
							<textarea rows={2} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="bg-transparent outline-none w-full font-bold text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 resize-none" placeholder="Город, Улица, Дом..." />
						</div>
					</div>

					{/* СИСТЕМНЫЕ НАСТРОЙКИ */}
					<div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-100 dark:border-slate-800">
						<h3 className="text-sm font-black text-gray-900 dark:text-white mb-4 uppercase">Системные настройки</h3>
						<div className="space-y-3">
							<label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
								<div className="flex items-center gap-3">
									<div className={`p-2 rounded-xl ${soundEnabled ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}>
										<Volume2 size={20} />
									</div>
									<div>
										<div className="font-bold text-gray-900 dark:text-white text-sm">Звуковые уведомления</div>
										<div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Воспроизводить звук при новых сообщениях</div>
									</div>
								</div>
								<div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${soundEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
									<div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
								</div>
								<input type="checkbox" className="hidden" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
							</label>

							<label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
								<div className="flex items-center gap-3">
									<div className={`p-2 rounded-xl ${notificationsEnabled ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}>
										<Bell size={20} />
									</div>
									<div>
										<div className="font-bold text-gray-900 dark:text-white text-sm">Push уведомления</div>
										<div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Показывать всплывающие уведомления</div>
									</div>
								</div>
								<div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
									<div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
								</div>
								<input type="checkbox" className="hidden" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
							</label>

							<div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
										<Moon size={20} />
									</div>
									<div>
										<div className="font-bold text-gray-900 dark:text-white text-sm">Оформление</div>
										<div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Выберите тему интерфейса</div>
									</div>
								</div>

								<div className="grid grid-cols-3 gap-2 mt-2 bg-gray-200/50 dark:bg-slate-900/50 p-1 rounded-xl">
									<button
										onClick={() => setTheme('light')}
										className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
									>
										<Sun size={14} /> СВЕТЛАЯ
									</button>
									<button
										onClick={() => setTheme('dark')}
										className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
									>
										<Moon size={14} /> ТЁМНАЯ
									</button>
									<button
										onClick={() => setTheme('system')}
										className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
									>
										<Monitor size={14} /> СИСТЕМА
									</button>
								</div>
							</div>
						</div>
					</div>

					<div className="col-span-1 md:col-span-2 pt-4 flex gap-4">
						<button onClick={handleSave} disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-70">
							{isSaving ? <Loader className="animate-spin" size={20} /> : <><Save size={20} /> Сохранить настройки</>}
						</button>
						<button onClick={() => setShowPassModal(true)} className="px-6 py-4 bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white font-bold rounded-xl transition-colors flex items-center gap-2">
							<Key size={20} /> Изменить пароль
						</button>
					</div>
				</div>
			</div>

			<AnimatePresence>
				{showPassModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
						<div className="absolute inset-0" onClick={() => setShowPassModal(false)}></div>
						<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative z-10 border border-transparent dark:border-slate-800">
							<button onClick={() => setShowPassModal(false)} className="absolute top-5 right-5 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 dark:text-gray-500 transition-colors"><X size={20} /></button>
							<h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">Смена пароля</h3>
							<form onSubmit={handleChangePassword} className="space-y-3">
								<input type="password" required placeholder="Старый пароль" value={passData.old_password} onChange={e => setPassData({ ...passData, old_password: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 font-bold outline-none focus:border-blue-300 dark:focus:border-blue-500/50 transition-colors placeholder-gray-400 dark:placeholder-gray-500" />
								<input type="password" required placeholder="Новый пароль" value={passData.new_password} onChange={e => setPassData({ ...passData, new_password: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 font-bold outline-none focus:border-blue-300 dark:focus:border-blue-500/50 transition-colors placeholder-gray-400 dark:placeholder-gray-500" />
								<button type="submit" disabled={isPassSaving} className="w-full mt-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-70 flex justify-center">
									{isPassSaving ? <Loader className="animate-spin" /> : 'Готово'}
								</button>
							</form>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</motion.div>
	);
};

export default SettingsPage;