// src/components/client/PublicTrackingModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MapPin, Truck, CheckCircle, Clock, CalendarDays, Loader } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

interface PublicTrackingModalProps {
	isOpen: boolean;
	onClose: () => void;
}

interface TrackResult {
	track_code: string;
	status: string;
	status_display: string;
	weight: number;
	history: {
		status_display: string;
		location: string;
		created_at: string;
	}[];
}

const PublicTrackingModal = ({ isOpen, onClose }: PublicTrackingModalProps) => {
	const [trackCode, setTrackCode] = useState('');
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<TrackResult | null>(null);

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!trackCode.trim()) return;

		setLoading(true);
		setResult(null);

		try {
			const res = await api.get(`/api/packages/track/${trackCode.trim()}/`);
			setResult(res.data);
		} catch (err: any) {
			if (err.response?.status === 404) {
				toast.error('Посылка с таким трек-кодом не найдена');
			} else {
				toast.error('Ошибка при поиске');
			}
		} finally {
			setLoading(false);
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'arrived_dushanbe': return <MapPin className="text-purple-500" size={24} />;
			case 'delivered': return <CheckCircle className="text-green-500" size={24} />;
			case 'china_warehouse':
			case 'in_transit': return <Truck className="text-blue-500" size={24} />;
			default: return <Clock className="text-gray-500" size={24} />;
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
					className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
					onClick={onClose}
				>
					<motion.div
						initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
						onClick={e => e.stopPropagation()}
						className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col"
					>
						{/* Для мобилок (TG) полоска смахивания */}
						<div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden"></div>

						<div className="flex justify-between items-center mb-6">
							<h3 className="text-2xl font-black text-slate-800">Где посылка?</h3>
							<button onClick={onClose} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
								<X size={20} className="text-slate-400" />
							</button>
						</div>

						{/* Форма поиска */}
						<form onSubmit={handleSearch} className="mb-6 shrink-0">
							<div className="relative flex gap-2">
								<div className="relative flex-1">
									<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
									<input
										type="text"
										autoFocus
										value={trackCode}
										onChange={e => setTrackCode(e.target.value)}
										placeholder="Введите трек-код..."
										className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl py-3 pl-12 pr-4 font-mono font-bold outline-none transition-all text-slate-800"
									/>
								</div>
								<button
									type="submit"
									disabled={loading || !trackCode}
									className="bg-blue-600 text-white px-6 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
								>
									{loading ? <Loader className="animate-spin" size={20} /> : 'Найти'}
								</button>
							</div>
							<p className="text-[10px] text-slate-400 font-bold uppercase mt-2 text-center">
								Безопасный поиск. Данные владельца скрыты.
							</p>
						</form>

						{/* Результат */}
						<div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
							{result && (
								<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-4">
									<div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center justify-between">
										<div className="flex items-center gap-4">
											<div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
												{getStatusIcon(result.status)}
											</div>
											<div>
												<p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Текущий статус</p>
												<h4 className="text-lg font-black text-slate-800 leading-tight">{result.status_display}</h4>
											</div>
										</div>
										<div className="text-right">
											<p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Вес</p>
											<span className="font-bold text-slate-700">{result.weight > 0 ? `${result.weight} кг` : '—'}</span>
										</div>
									</div>

									{/* Таймлайн истории */}
									<div>
										<h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
											<CalendarDays size={18} className="text-blue-500" />
											История перемещений
										</h4>
										{result.history && result.history.length > 0 ? (
											<div className="flex flex-col gap-5 border-l-2 border-slate-200 pl-6 ml-2 py-2">
												{result.history.map((hist, idx) => (
													<div key={idx} className="relative">
														<div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm ring-2 ring-blue-100"></div>
														<div className="flex flex-col">
															<span className="text-sm font-bold text-slate-800">{hist.status_display}</span>
															<span className="text-xs font-bold text-slate-400 mt-1">{new Date(hist.created_at).toLocaleString('ru-RU')}</span>
															<span className="text-xs font-medium text-slate-500 mt-0.5">📍 {hist.location}</span>
														</div>
													</div>
												))}
											</div>
										) : (
											<p className="text-sm text-slate-400 text-center py-4">История пуста</p>
										)}
									</div>
								</motion.div>
							)}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default PublicTrackingModal;