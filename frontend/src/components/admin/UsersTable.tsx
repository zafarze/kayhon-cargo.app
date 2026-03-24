// src/components/admin/UsersTable.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, ShieldCheck, User as UserIcon, X, Loader, Trash2, Edit } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { BeautifulSelect } from '../ui/BeautifulSelect';
import { customConfirm } from '../../utils/customConfirm';

interface IUser {
	id: number;
	username: string;
	first_name: string;
	email: string;
	role: string;
	avatar?: string | null;
}

interface UsersTableProps {
	users: IUser[];
	refreshData: () => void;
}

const UsersTable = ({ users, refreshData }: UsersTableProps) => {
	// Состояние модалки
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Режим работы модалки: создание или редактирование
	const [isEditMode, setIsEditMode] = useState(false);
	const [editingUserId, setEditingUserId] = useState<number | null>(null);

	// Данные формы
	const [formData, setFormData] = useState({
		first_name: '',
		username: '',
		email: '',
		password: '',
		role: 'manager'
	});

	// --- 1. ХЕЛПЕР ДЛЯ АВАТАРКИ ---
	const getAvatarUrl = (path: string | null | undefined) => {
		if (!path) return null;
		if (path.startsWith('http')) return path;
		return `${import.meta.env.VITE_API_URL || 'https://kayhon-backend-538751744849.europe-west3.run.app'}${path}`;
	};

	// --- 2. ЗАКРЫТИЕ ПО ESC ---
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setIsModalOpen(false);
		};
		if (isModalOpen) window.addEventListener('keydown', handleEsc);
		return () => window.removeEventListener('keydown', handleEsc);
	}, [isModalOpen]);

	// Открытие окна для СОЗДАНИЯ
	const handleOpenCreate = () => {
		setIsEditMode(false);
		setEditingUserId(null);
		setFormData({ first_name: '', username: '', email: '', password: '', role: 'manager' });
		setIsModalOpen(true);
	};

	// Открытие окна для РЕДАКТИРОВАНИЯ
	const handleOpenEdit = (user: IUser) => {
		setIsEditMode(true);
		setEditingUserId(user.id);

		let roleVal = 'manager';
		if (user.role === 'Администратор' || user.role === 'Супер-Админ') roleVal = 'admin';
		if (user.role === 'Складчик') roleVal = 'warehouse';
		if (user.role === 'Доставщик') roleVal = 'courier';

		setFormData({
			first_name: user.first_name || '',
			username: user.username || '',
			email: user.email || '',
			password: '',
			role: roleVal
		});
		setIsModalOpen(true);
	};

	// Функция СОХРАНИЯ
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		const toastId = toast.loading(isEditMode ? 'Сохранение изменений...' : 'Создание сотрудника...');

		try {
			if (isEditMode && editingUserId) {
				await api.patch(`/api/auth/users/${editingUserId}/`, formData);
				toast.success('Сотрудник успешно обновлен!', { id: toastId });
			} else {
				await api.post('/api/auth/users/create/', formData);
				toast.success('Сотрудник успешно создан!', { id: toastId });
			}

			setIsModalOpen(false);
			refreshData();
		} catch (error: any) {
			toast.error(error.response?.data?.error || "Ошибка при сохранении", { id: toastId });
		} finally {
			setIsLoading(false);
		}
	};

	// Функция УДАЛЕНИЯ
	const handleDeleteUser = async (id: number, name: string) => {
		customConfirm(`Вы точно хотите безвозвратно удалить сотрудника ${name}?`, async () => {
			const toastId = toast.loading('Удаление...');
			try {
				await api.delete(`/api/auth/users/${id}/`);
				toast.success('Сотрудник удален', { id: toastId });
				refreshData();
			} catch (error: any) {
				toast.error(error.response?.data?.error || "Ошибка при удалении", { id: toastId });
			}
		});
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden relative transition-colors"
		>
			<div className="p-8 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 transition-colors">
				<div>
					<h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
						<ShieldCheck className="text-purple-500" size={24} />
						Сотрудники и Пользователи
					</h2>
					<p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Управление доступом к системе</p>
				</div>
				<button
					onClick={handleOpenCreate}
					className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-purple-200"
				>
					+ Добавить сотрудника
				</button>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-left border-collapse">
					<thead>
						<tr className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider font-semibold border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/50">
							<th className="p-6 pl-8">Пользователь</th>
							<th className="p-6">Контакты</th>
							<th className="p-6 text-center">Роль</th>
							<th className="p-6 text-right pr-8">Действия</th>
						</tr>
					</thead>
					<tbody className="text-sm text-gray-600 dark:text-gray-300">
						{users.map((user, index) => (
							<motion.tr
								key={user.id}
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: index * 0.05 }}
								className="hover:bg-purple-50/30 dark:hover:bg-purple-900/20 transition-colors border-b border-gray-50 dark:border-slate-800 last:border-0"
							>
								<td className="p-5 pl-8">
									<div className="flex items-center gap-4">
										<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-600 flex items-center justify-center font-black overflow-hidden shadow-sm shrink-0">
											{/* --- ИСПРАВЛЕННЫЙ ВЫВОД АВАТАРКИ --- */}
											{user.avatar ? (
												<img
													src={getAvatarUrl(user.avatar) || ''}
													alt="ava"
													className="w-full h-full object-cover"
												/>
											) : (
												user.first_name ? user.first_name[0].toUpperCase() : <UserIcon size={20} />
											)}
										</div>
										<div>
											<div className="font-bold text-gray-900 dark:text-white">{user.first_name || 'Без имени'}</div>
											<div className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Логин: {user.username}</div>
										</div>
									</div>
								</td>
								<td className="p-5 space-y-1">
									<div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium text-xs">
										<Mail size={14} className="text-gray-400 dark:text-gray-500" /> {user.email || '—'}
									</div>
								</td>
								<td className="p-5 text-center">
									<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${user.role === 'Супер-Админ' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50' :
										user.role === 'Администратор' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50' :
											user.role === 'Менеджер' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50' :
												user.role === 'Складчик' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/50' :
													user.role === 'Доставщик' ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/50' :
														'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-slate-700'
										}`}>
										<Shield size={12} /> {user.role}
									</span>
								</td>
								<td className="p-5 text-right pr-8">
									<div className="flex justify-end gap-2">
										<button
											onClick={() => handleOpenEdit(user)}
											className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 p-2 rounded-lg transition-colors"
											title="Редактировать"
										>
											<Edit size={16} />
										</button>

										{user.role !== 'Супер-Админ' && (
											<button
												onClick={() => handleDeleteUser(user.id, user.first_name)}
												className="text-red-500 hover:text-red-700 dark:hover:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 p-2 rounded-lg transition-colors"
												title="Удалить"
											>
												<Trash2 size={16} />
											</button>
										)}
									</div>
								</td>
							</motion.tr>
						))}
					</tbody>
				</table>
			</div>

			<AnimatePresence>
				{isModalOpen && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
						{/* --- 3. ФОН ДЛЯ ЗАКРЫТИЯ --- */}
						<div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>

						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative z-10 border border-transparent dark:border-slate-800"
						>
							<button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-50 dark:bg-slate-800 p-2 rounded-full">
								<X size={20} />
							</button>

							<h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
								{isEditMode ? 'Редактировать сотрудника' : 'Новый сотрудник'}
							</h3>
							<p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
								{isEditMode ? 'Изменение данных аккаунта' : 'Создание аккаунта для доступа в CRM'}
							</p>

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">Имя сотрудника</label>
									<input
										type="text" required
										value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })}
										className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 mt-1 font-bold outline-none focus:border-purple-300 dark:focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
										placeholder="Зафар Зокиршоев"
									/>
								</div>

								<div>
									<label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">Email (Почта)</label>
									<input
										type="email"
										value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
										className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 mt-1 font-bold outline-none focus:border-purple-300 dark:focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
										placeholder="zafar@kayhon.tj"
									/>
								</div>

								<div>
									<label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">Логин для входа</label>
									<input
										type="text" required={!isEditMode}
										disabled={isEditMode}
										value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
										className={`w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 mt-1 font-bold outline-none focus:border-purple-300 dark:focus:border-purple-500 transition-colors lowercase ${isEditMode ? 'opacity-60 cursor-not-allowed' : 'focus:bg-white dark:focus:bg-slate-900'}`}
										placeholder="zafar_manager"
									/>
								</div>

								<div>
									<label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">
										Пароль {isEditMode && <span className="text-gray-300 dark:text-slate-600 normal-case font-medium">(Оставьте пустым, если не хотите менять)</span>}
									</label>
									<input
										type="text" required={!isEditMode}
										value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
										className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 mt-1 font-bold outline-none focus:border-purple-300 dark:focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
										placeholder={isEditMode ? "Новый пароль" : "Минимум 6 символов"}
									/>
								</div>

								<div className="pb-12">
									<label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Роль (Должность)</label>
									<BeautifulSelect
										value={formData.role}
										onChange={val => setFormData({ ...formData, role: val })}
										options={[
											{ value: 'admin', label: '👨‍💻 Администратор (Полный)' },
											{ value: 'manager', label: '📞 Менеджер (Заявки и Клиенты)' },
											{ value: 'warehouse', label: '📦 Складчик (Терминал)' },
											{ value: 'courier', label: '🛵 Доставщик (Только доставка)' }
										]}
									/>
								</div>

								<button type="submit" disabled={isLoading} className="w-full mt-6 bg-purple-600 text-white font-bold py-4 rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 disabled:opacity-70 flex justify-center items-center gap-2">
									{isLoading ? <Loader className="animate-spin" size={20} /> : (isEditMode ? 'Сохранить изменения' : 'Добавить сотрудника')}
								</button>
							</form>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</motion.div>
	);
};

export default UsersTable;