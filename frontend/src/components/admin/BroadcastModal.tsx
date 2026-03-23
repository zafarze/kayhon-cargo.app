import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Users, MapPin, CheckSquare, Square, Loader } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

interface BroadcastModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const BroadcastModal = ({ isOpen, onClose }: BroadcastModalProps) => {
	const [mode, setMode] = useState<'arrived' | 'all'>('arrived');
	const [message, setMessage] = useState('');
	const [clients, setClients] = useState<any[]>([]);
	const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState(false);

	useEffect(() => {
		if (isOpen && mode === 'arrived') {
			fetchClients();
			setMessage('🎉 Ваш груз отсортирован и готов к выдаче! Ждем вас на складе в Душанбе.');
		} else if (isOpen && mode === 'all') {
			setMessage('');
		}
	}, [isOpen, mode]);

	const fetchClients = async () => {
		setLoading(true);
		try {
			const res = await api.get('/api/notifications/broadcast/');
			setClients(res.data);
			setSelectedCodes(res.data.map((c: any) => c.client_code)); // Выбираем всех по умолчанию
		} catch (error) {
			toast.error('Ошибка загрузки клиентов');
		} finally {
			setLoading(false);
		}
	};

	const toggleClient = (code: string) => {
		setSelectedCodes(prev =>
			prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
		);
	};

	const handleSend = async () => {
		if (!message.trim()) return toast.error('Введите сообщение');
		if (mode === 'arrived' && selectedCodes.length === 0) return toast.error('Выберите получателей');

		setSending(true);
		try {
			const res = await api.post('/api/notifications/broadcast/', {
				type: mode,
				message: message.trim(),
				client_codes: selectedCodes
			});
			toast.success(res.data.message, { icon: '🚀' });
			onClose();
		} catch (error: any) {
			toast.error(error.response?.data?.error || 'Ошибка отправки');
		} finally {
			setSending(false);
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						onClick={e => e.stopPropagation()}
						className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
					>
						{/* Header */}
						<div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
									<Send size={24} />
								</div>
								<div>
									<h2 className="text-xl font-black">Рассылка уведомлений</h2>
									<p className="text-blue-100 text-xs font-bold mt-0.5">Связь с клиентами</p>
								</div>
							</div>
							<button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
								<X size={20} />
							</button>
						</div>

						{/* Tabs */}
						<div className="flex p-2 bg-slate-50 border-b border-slate-100 shrink-0">
							<button
								onClick={() => setMode('arrived')}
								className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'arrived' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
							>
								<MapPin size={18} /> Ждут выдачи ({mode === 'arrived' ? clients.length : 0})
							</button>
							<button
								onClick={() => setMode('all')}
								className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${mode === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
							>
								<Users size={18} /> Всем клиентам
							</button>
						</div>

						{/* Body */}
						<div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">

							<div>
								<label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Текст сообщения</label>
								<textarea
									value={message}
									onChange={e => setMessage(e.target.value)}
									rows={4}
									className="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 rounded-2xl p-4 font-medium text-slate-800 outline-none transition-all resize-none"
									placeholder="Введите текст уведомления..."
								/>
							</div>

							{mode === 'arrived' && (
								<div className="flex-1 flex flex-col min-h-0">
									<div className="flex justify-between items-end mb-2 ml-1">
										<label className="text-xs font-black text-slate-400 uppercase">
											Кому отправить ({selectedCodes.length} из {clients.length})
										</label>
										<button
											onClick={() => setSelectedCodes(selectedCodes.length === clients.length ? [] : clients.map(c => c.client_code))}
											className="text-xs font-bold text-blue-600 hover:underline"
										>
											{selectedCodes.length === clients.length ? 'Снять выделение' : 'Выбрать всех'}
										</button>
									</div>

									<div className="bg-slate-50 border border-slate-100 rounded-2xl p-2 max-h-60 overflow-y-auto custom-scrollbar">
										{loading ? (
											<div className="flex flex-col items-center justify-center p-8 text-slate-400">
												<Loader className="animate-spin mb-2" size={24} />
												<span className="text-sm font-bold">Ищем клиентов...</span>
											</div>
										) : clients.length === 0 ? (
											<div className="text-center p-8 text-slate-400 font-medium text-sm">
												Фасовка завершена. Нет посылок ожидающих уведомления.
											</div>
										) : (
											<div className="space-y-1">
												{clients.map(client => (
													<div
														key={client.client_code}
														onClick={() => toggleClient(client.client_code)}
														className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border ${selectedCodes.includes(client.client_code) ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:border-slate-200'}`}
													>
														<div className="flex items-center gap-3">
															<div className={selectedCodes.includes(client.client_code) ? 'text-blue-600' : 'text-slate-300'}>
																{selectedCodes.includes(client.client_code) ? <CheckSquare size={20} /> : <Square size={20} />}
															</div>
															<div>
																<p className="font-bold text-slate-800 text-sm">{client.first_name}</p>
																<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{client.client_code}</p>
															</div>
														</div>
														<div className="bg-white px-3 py-1 rounded-lg border border-slate-100 text-xs font-bold text-slate-600 shadow-sm">
															{client.package_count} шт.
														</div>
													</div>
												))}
											</div>
										)}
									</div>
									<p className="text-[10px] font-bold text-orange-500 mt-3 text-center uppercase">
										* После отправки статус их посылок автоматически изменится на "Готов к выдаче"
									</p>
								</div>
							)}

							{mode === 'all' && (
								<div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 flex gap-4">
									<div className="text-orange-500 shrink-0"><Users size={24} /></div>
									<div>
										<h4 className="font-bold text-orange-800 text-sm mb-1">Массовая рассылка</h4>
										<p className="text-xs text-orange-600/80 font-medium">Это сообщение будет отправлено абсолютно всем зарегистрированным клиентам в системе.</p>
									</div>
								</div>
							)}

						</div>

						{/* Footer */}
						<div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
							<button
								onClick={handleSend}
								disabled={sending || (mode === 'arrived' && selectedCodes.length === 0)}
								className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{sending ? <Loader className="animate-spin" size={20} /> : <><Send size={20} /> Отправить уведомления</>}
							</button>
						</div>

					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default BroadcastModal;