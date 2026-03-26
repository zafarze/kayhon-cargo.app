// src/components/admin/ReadyPackagesModal.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, User, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { customConfirm } from '../../utils/customConfirm';

interface ReadyPackagesModalProps {
	isOpen: boolean;
	onClose: () => void;
	data: any;
	onSuccess?: () => void;
	onHistoryClick?: (clientCode: string) => void;
}

const ReadyPackagesModal = ({ isOpen, onClose, data, onSuccess, onHistoryClick }: ReadyPackagesModalProps) => {
	const [isDelivering, setIsDelivering] = useState(false);
	const [selectedPackages, setSelectedPackages] = useState<number[]>([]);

	// --- Обработка нажатия ESC ---
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};

		if (isOpen) {
			window.addEventListener('keydown', handleEsc);
		}

		return () => window.removeEventListener('keydown', handleEsc);
	}, [isOpen, onClose]);

	// Выделяем все посылки по умолчанию при загрузке данных
	useEffect(() => {
		if (isOpen && data?.packages) {
			setSelectedPackages(data.packages.map((p: any) => p.id));
		} else {
			setSelectedPackages([]);
		}
	}, [isOpen, data]);

	if (!data) return null;
	const { client, packages, count } = data;

	const selectedData = packages.filter((p: any) => selectedPackages.includes(p.id));
	const totalSum = selectedData.reduce((acc: number, p: any) => acc + Number(p.total_price || 0), 0);
	const selectedCount = selectedPackages.length;

	const handleIssue = async () => {
		if (selectedCount === 0) {
			toast.error('Выберите посылки для выдачи');
			return;
		}

		customConfirm(`Выдать выбранные (${selectedCount} шт) на сумму ${totalSum.toFixed(2)} с. клиенту ${client.first_name}?`, async () => {
			setIsDelivering(true);
			try {
				await api.post('/api/packages/deliver-all/', {
					client_code: client.client_code,
					package_ids: selectedPackages
				});
				toast.success('Посылки успешно выданы и оплачены!');
				onClose();
				if (onSuccess) onSuccess();
			} catch (error: any) {
				toast.error(error.response?.data?.error || 'Ошибка при выдаче');
			} finally {
				setIsDelivering(false);
			}
		});
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
					<div className="absolute inset-0" onClick={onClose}></div>

					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.9 }}
						className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl relative overflow-hidden z-10"
					>
						{/* Шапка модалки */}
						<div className="bg-blue-600 p-6 text-white relative overflow-hidden">
							<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

							<button
								onClick={onClose}
								className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 p-2 rounded-full backdrop-blur-md transition-colors z-20 hover:bg-white/20"
							>
								<X size={20} />
							</button>

							<div className="flex items-center gap-4 relative z-10">
								<div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner-white">
									<User size={32} className="text-white" />
								</div>
								<div>
									<h2 className="text-2xl font-black leading-tight">{client.first_name}</h2>
									<p className="text-blue-100 font-bold opacity-80 flex items-center gap-2 mt-1">
										<span className="bg-black/20 px-2 py-0.5 rounded uppercase text-xs">ID: {client.client_code}</span>
										<span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
											{client.phone_number}
										</span>
									</p>
								</div>
							</div>
						</div>

						{/* Тело модалки */}
						<div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-[#F3F5F9]">
							<h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
								{count > 0 ? (
									<span className="flex items-center gap-2"><CheckCircle2 className="text-green-500" /> Готовы к выдаче: {count} шт.</span>
								) : (
									<span className="flex items-center gap-2"><AlertCircle className="text-orange-500" /> Нет посылок к выдаче</span>
								)}
								{count > 0 && (
									<button
										onClick={() => setSelectedPackages(count === selectedCount ? [] : packages.map((p: any) => p.id))}
										className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
									>
										{count === selectedCount ? 'Снять все' : 'Выбрать все'}
									</button>
								)}
							</h3>

							{count === 0 && (
								<div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
									<Package size={48} className="text-gray-300 mx-auto mb-3" />
									<p className="text-gray-500 font-medium">Все посылки этого клиента еще в пути <br />или уже выданы.</p>
								</div>
							)}

							{count > 0 && (
								<div className="space-y-3">
									{packages.map((pkg: any) => {
										const isSelected = selectedPackages.includes(pkg.id);
										return (
											<motion.div
												key={pkg.id}
												className={`bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 cursor-pointer transition-all border-2 ${isSelected ? 'border-blue-400 bg-blue-50/40' : 'border-transparent hover:border-gray-200'}`}
												onClick={() => {
													if (isSelected) setSelectedPackages(prev => prev.filter(id => id !== pkg.id));
													else setSelectedPackages(prev => [...prev, pkg.id]);
												}}
											>
												<div className="flex items-center gap-4">
													<div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600' : 'bg-gray-200'}`}>
														{isSelected && <CheckCircle2 size={14} className="text-white" />}
													</div>
													<div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
														<Package size={24} />
													</div>
													<div>
														<div className="font-black text-lg text-gray-900 leading-none mb-1">{pkg.track_code}</div>
														<div className="text-xs text-gray-500 font-semibold">{pkg.weight || '0.00'} кг</div>
													</div>
												</div>
												<div className="text-right">
													<div className="font-black text-lg text-gray-800">{Number(pkg.total_price || 0).toFixed(2)} с.</div>
												</div>
											</motion.div>
										);
									})}
								</div>
							)}
						</div>

						{/* Футер */}
						{count > 0 && (
							<div className="p-6 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] relative z-20">
								<button
									onClick={() => {
										onClose();
										if (onHistoryClick) onHistoryClick(client.client_code);
									}}
									className="text-white font-bold py-3 px-6 rounded-xl transition-colors bg-slate-800 hover:bg-slate-700 shadow-md flex items-center gap-2"
								>
									История
								</button>
								<div className="flex items-center gap-4">
									<div className="text-right">
										<p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">К оплате</p>
										<p className="text-2xl font-black text-gray-900 leading-none">{totalSum.toFixed(2)} с.</p>
									</div>
									<button
										onClick={handleIssue}
										disabled={isDelivering || selectedCount === 0}
										className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 md:px-8 rounded-xl transition-colors shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
									>
										{isDelivering ? <Loader className="animate-spin" size={20} /> : `Выдать (${selectedCount})`}
									</button>
								</div>
							</div>
						)}
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default ReadyPackagesModal;