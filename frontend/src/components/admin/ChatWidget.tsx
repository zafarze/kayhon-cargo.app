import React, { useEffect, useState, useRef } from 'react';
import { MessageCircle, X, Send, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api';
import { useNavigate } from 'react-router-dom';

interface IChatClient {
	client_code: string;
	first_name: string;
	avatar: string | null;
	last_message: string;
	last_message_date: string | null;
	unread_count: number;
}

interface IMessage {
	id: number;
	sender: number;
	sender_avatar: string | null;
	receiver: number | null;
	text: string;
	created_at: string;
	is_read: boolean;
}

const getAva = (path: string | null | undefined) => {
	if (!path) return null;
	if (path.startsWith('http')) return path;
	const API_URL = import.meta.env.VITE_API_URL || 'https://kayhon-backend-538751744849.europe-west3.run.app';
	return `${API_URL}${path}`;
};

const ChatWidget = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [clients, setClients] = useState<IChatClient[]>([]);
	const [activeClient, setActiveClient] = useState<IChatClient | null>(null);
	const [messages, setMessages] = useState<IMessage[]>([]);
	const [text, setText] = useState('');
	const [unreadTotal, setUnreadTotal] = useState(0);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	const fetchClients = async () => {
		try {
			const res = await api.get('/api/chat-list/');
			setClients(res.data);
			const total = res.data.reduce((acc: number, c: IChatClient) => acc + c.unread_count, 0);
			setUnreadTotal(total);
		} catch (error) {
			console.error('Widget chat list error', error);
		}
	};

	const fetchMessages = async (client_code: string) => {
		try {
			const res = await api.get(`/api/chat/${client_code}/`);
			setMessages(res.data);
			setTimeout(() => {
				messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
			}, 100);
		} catch (error) {
			console.error('Widget chat messages error', error);
		}
	};

	useEffect(() => {
		fetchClients();
		const interval = setInterval(fetchClients, 5000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (activeClient) {
			fetchMessages(activeClient.client_code);
			const interval = setInterval(() => fetchMessages(activeClient.client_code), 3000);
			return () => clearInterval(interval);
		}
	}, [activeClient]);

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!text.trim() || !activeClient) return;
		try {
			await api.post(`/api/chat/${activeClient.client_code}/`, { text });
			setText('');
			await fetchMessages(activeClient.client_code);
			fetchClients();
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: 20, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 20, scale: 0.95 }}
						transition={{ duration: 0.2 }}
						className="mb-4 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
					>
						{!activeClient ? (
							<>
								<div className="bg-blue-600 text-white p-4 flex justify-between items-center">
									<div>
										<h3 className="font-bold text-lg">Сообщения</h3>
										<p className="text-blue-100 text-xs">Поддержка клиентов</p>
									</div>
									<div className="flex items-center gap-2">
										<button onClick={() => navigate('/admin/chat')} className="text-white/80 hover:text-white text-xs underline">
											На весь экран
										</button>
										<button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white bg-white/10 p-1.5 rounded-full">
											<X size={18} />
										</button>
									</div>
								</div>
								<div className="flex-1 overflow-y-auto p-2 bg-slate-50">
									{clients.length === 0 ? (
										<div className="text-center text-slate-400 mt-10 text-sm">Нет чатов</div>
									) : (
										clients.map(client => (
											<div
												key={client.client_code}
												onClick={() => setActiveClient(client)}
												className="p-3 rounded-xl cursor-pointer hover:bg-white border border-transparent hover:border-slate-200 transition-all flex items-center gap-3 mb-1 bg-white shadow-sm"
											>
												<div className="w-10 h-10 bg-blue-100 rounded-full flex-shrink-0 overflow-hidden relative">
													{client.avatar ? (
														<img src={getAva(client.avatar)!} alt="" className="w-full h-full object-cover" />
													) : (
														<div className="w-full h-full flex items-center justify-center text-blue-600 font-bold">{client.first_name?.[0] || 'C'}</div>
													)}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex justify-between items-center">
														<h4 className="font-bold text-sm text-slate-800 truncate">{client.first_name || 'Клиент'}</h4>
														{client.unread_count > 0 && (
															<span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
																{client.unread_count}
															</span>
														)}
													</div>
													<p className="text-xs text-slate-500 truncate mt-0.5">{client.last_message || '...'}</p>
												</div>
											</div>
										))
									)}
								</div>
							</>
						) : (
							<>
								<div className="bg-white border-b border-slate-200 p-3 flex justify-between items-center shadow-sm z-10">
									<div className="flex items-center gap-2">
										<button onClick={() => setActiveClient(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
											<ArrowLeft size={18} className="text-slate-600" />
										</button>
										<div className="flex flex-col">
											<span className="font-bold text-sm text-slate-800">{activeClient.first_name || 'Клиент'}</span>
										</div>
									</div>
									<button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
										<X size={18} className="text-slate-600" />
									</button>
								</div>

								<div className="flex-1 overflow-y-auto p-4 bg-[#F8FAFC] flex flex-col gap-3">
									{messages.map((msg) => {
										const isMine = msg.receiver !== null;
										return (
											<div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
												<div className={`relative px-3 py-2 max-w-[85%] rounded-2xl ${isMine ? 'bg-[#E3FFD4] text-slate-800 rounded-br-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'} shadow-sm`}>
													<p className="text-[13px] leading-snug pb-3 pr-4">{msg.text}</p>
													<div className="absolute bottom-1 right-2 flex items-center gap-0.5">
														<span className="text-[9px] text-slate-400">
															{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
														</span>
														{isMine && (
															<span className="ml-0.5">
																{msg.is_read ? <CheckCheck size={12} className="text-[#34B7F1]" /> : <Check size={12} className="text-slate-400" />}
															</span>
														)}
													</div>
												</div>
											</div>
										);
									})}
									<div ref={messagesEndRef} />
								</div>

								<div className="p-3 bg-white border-t border-slate-200">
									<form onSubmit={handleSend} className="flex gap-2">
										<input
											type="text"
											value={text}
											onChange={e => setText(e.target.value)}
											placeholder="Сообщение..."
											className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors"
										/>
										<button
											type="submit"
											disabled={!text.trim()}
											className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 shrink-0 hover:bg-blue-700 transition-colors"
										>
											<Send size={16} className="ml-0.5" />
										</button>
									</form>
								</div>
							</>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 transition-transform active:scale-95 relative"
			>
				{isOpen ? <X size={24} /> : <MessageCircle size={28} />}

				{!isOpen && unreadTotal > 0 && (
					<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
						{unreadTotal > 99 ? '99+' : unreadTotal}
					</span>
				)}
			</button>
		</div>
	);
};

export default ChatWidget;