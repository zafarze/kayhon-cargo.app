// src/components/admin/EditPackageModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Package, MapPin, Weight, Loader } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { IPackage } from '../../types';
import { BeautifulSelect } from '../ui/BeautifulSelect';

interface EditPackageModalProps {
	isOpen: boolean;
	onClose: () => void;
	pkg: IPackage | null;
	onSuccess: () => void;
}

const EditPackageModal = ({ isOpen, onClose, pkg, onSuccess }: EditPackageModalProps) => {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		status: '',
		weight: '',
		shelf_location: '',
		track_code: ''
	});

	// 1. Синхронизация данных при открытии
	useEffect(() => {
		if (pkg) {
			setFormData({
				status: pkg.status,
				weight: String(pkg.weight),
				shelf_location: pkg.shelf_location || '',
				track_code: pkg.track_code
			});
		}
	}, [pkg]);

	// 2. Обработка нажатия клавиши ESC
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				onClose();
			}
		};

		if (isOpen) {
			window.addEventListener('keydown', handleEsc);
		}

		return () => window.removeEventListener('keydown', handleEsc);
	}, [isOpen, onClose]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!pkg) return;

		setLoading(true);
		try {
			await api.post('/api/packages/update/', {
				track_code: formData.track_code,
				new_status: formData.status,
				weight: formData.weight,
				shelf_location: formData.shelf_location
			});
			toast.success('Посылка успешно обновлена!');
			onSuccess(); // Обновляем таблицу родителя
			onClose();   // Закрываем модалку
		} catch (error: any) {
			console.error(error);
			toast.error(error.response?.data?.error || 'Ошибка при обновлении');
		} finally {
			setLoading(false);
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
					{/* Клик по фону закрывает окно */}
					<div className="absolute inset-0" onClick={onClose}></div>

					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative z-10"
					>
						{/* Кнопка закрытия */}
						<button
							onClick={onClose}
							className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 bg-gray-50 p-2 rounded-full transition-colors"
						>
							<X size={20} />
						</button>

						{/* Заголовок */}
						<div className="flex items-center gap-3 mb-6">
							<div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
								<Package size={24} />
							</div>
							<div>
								<h3 className="text-xl font-black text-gray-900 leading-none mb-1">Редактирование</h3>
								<p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{formData.track_code}</p>
							</div>
						</div>

						<form onSubmit={handleSubmit} className="space-y-4">
							{/* Статус */}
							<div className="pb-16 z-50">
								<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Статус</label>
								<BeautifulSelect
									value={formData.status}
									onChange={val => setFormData({ ...formData, status: val })}
									options={[
										{ value: 'expected', label: '⏳ Ожидается' },
										{ value: 'china_warehouse', label: '🇨🇳 На складе (Китай)' },
										{ value: 'in_transit', label: '🚛 В пути' },
										{ value: 'arrived_dushanbe', label: '🇹🇯 Прибыл (Душанбе)' },
										{ value: 'delivered', label: '✅ Выдан' }
									]}
								/>
							</div>

							{/* Вес и Полка (в одну строку) */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Вес (кг)</label>
									<div className="relative mt-1">
										<Weight className="absolute left-3 top-3.5 text-gray-400" size={16} />
										<input
											type="number" step="0.01"
											value={formData.weight}
											onChange={e => setFormData({ ...formData, weight: e.target.value })}
											className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-3 font-bold outline-none focus:border-blue-300"
										/>
									</div>
								</div>
								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Полка</label>
									<div className="relative mt-1">
										<MapPin className="absolute left-3 top-3.5 text-gray-400" size={16} />
										<input
											type="text"
											value={formData.shelf_location}
											onChange={e => setFormData({ ...formData, shelf_location: e.target.value })}
											className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-3 font-bold outline-none focus:border-blue-300"
											placeholder="A-1"
										/>
									</div>
								</div>
							</div>

							{/* Кнопка сохранения */}
							<button
								type="submit"
								disabled={loading}
								className="w-full mt-4 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex justify-center items-center gap-2 disabled:opacity-70"
							>
								{loading ? <Loader className="animate-spin" size={20} /> : <><Save size={18} /> Сохранить</>}
							</button>
						</form>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default EditPackageModal;