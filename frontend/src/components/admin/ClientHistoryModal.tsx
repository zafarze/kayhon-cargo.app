import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, CheckCircle2, Loader, Archive } from 'lucide-react';
import { api } from '../../api';

interface ClientHistoryModalProps {
	isOpen: boolean;
	onClose: () => void;
	clientCode: string;
}

const ClientHistoryModal = ({ isOpen, onClose, clientCode }: ClientHistoryModalProps) => {
	const [packages, setPackages] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [nextUrl, setNextUrl] = useState<string | null>(null);

	useEffect(() => {
		const fetchHistory = async () => {
			if (!isOpen || !clientCode) return;
			setIsLoading(true);
			try {
				const response = await api.get(`/api/packages/?search=${clientCode}&status=delivered`);
				setPackages(response.data.results || []);
				setNextUrl(response.data.next);
			} catch (error) {
				console.error("Ошибка при получении истории", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchHistory();
	}, [isOpen, clientCode]);

	const loadMore = async () => {
		if (!nextUrl) return;
		setIsLoading(true);
		try {
			// Extract path and query from full absolute URL 
			const urlObj = new URL(nextUrl);
			const urlPath = urlObj.pathname + urlObj.search;
			const response = await api.get(urlPath);
			setPackages(prev => [...prev, ...(response.data.results || [])]);
			setNextUrl(response.data.next);
		} catch (error) {
			console.error("Ошибка при загрузке дополнительных записей", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
					<div className="absolute inset-0" onClick={onClose}></div>

					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 10 }}
						className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl relative overflow-hidden z-10 flex flex-col max-h-[85vh]"
					>
                        <div className="bg-slate-800 p-6 text-white shrink-0 relative">
                            <button
								onClick={onClose}
								className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 p-2 rounded-full transition-colors z-20 hover:bg-white/20"
							>
								<X size={20} />
							</button>
                            <div className="flex items-center gap-4 relative z-10">
								<div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shadow-inner">
									<Archive size={28} className="text-white" />
								</div>
								<div>
									<h2 className="text-2xl font-black leading-tight">История клиента</h2>
									<p className="text-slate-300 font-medium flex items-center gap-2 mt-1">
                                        ID: <span className="text-white font-bold">{clientCode}</span>
									</p>
								</div>
							</div>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
                            {packages.length === 0 && isLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader className="animate-spin text-slate-400" size={32} />
                                </div>
                            ) : packages.length === 0 ? (
                                <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 py-12">
									<Package size={48} className="text-gray-300 mx-auto mb-3" />
									<p className="text-gray-500 font-medium">История посылок пуста.<br/>Клиент еще не получал посылки.</p>
								</div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        {packages.map((pkg: any) => (
                                            <div key={pkg.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4 shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                                                        <CheckCircle2 size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{pkg.track_code}</div>
                                                        <div className="text-xs text-gray-400 font-medium">{pkg.weight || '0.00'} кг • Выдано: {pkg.delivered_at ? new Date(pkg.delivered_at).toLocaleDateString('ru-RU') : (pkg.payment_date ? new Date(pkg.payment_date).toLocaleDateString('ru-RU') : 'Ранее')}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-gray-800">{Number(pkg.total_price || 0).toFixed(2)}$</div>
                                                    <div className="text-[10px] text-green-500 font-bold uppercase mt-0.5">Оплачено</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {nextUrl && (
                                        <div className="flex justify-center pt-2">
                                            <button 
                                                onClick={loadMore} 
                                                disabled={isLoading}
                                                className="bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-600 font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2"
                                            >
                                                {isLoading ? <Loader className="animate-spin" size={18} /> : null}
                                                {isLoading ? 'Загрузка...' : 'Загрузить ещё'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default ClientHistoryModal;
