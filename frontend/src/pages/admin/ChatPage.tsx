import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader, Send, MessageCircle, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

interface IChatClient {
	client_code: string;
	first_name: string;
	phone: string;
	avatar: string | null;
	last_message: string;
	last_message_date: string | null;
	unread_count: number;
}

interface IMessage {
	id: number;
	sender: number;
	sender_name: string;
	sender_avatar: string | null;
	receiver: number | null;
	text: string;
	created_at: string;
	is_read: boolean;
}

const getAva = (path: string | null | undefined) => {
	if (!path) return null;
	if (path.startsWith('http')) return path;
	const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
	return `${API_URL}${path}`;
};

// 👇 УМНАЯ ФУНКЦИЯ ДЛЯ СТАТУСА "БЫЛ(А) НЕДАВНО" 👇
const formatLastSeen = (dateString: string | null) => {
	if (!dateString) return 'был(а) недавно';
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);

	if (diffMins < 5) return 'в сети';
	if (diffMins < 60) return `был(а) ${diffMins} минут назад`;
	if (diffHours < 24 && now.getDate() === date.getDate()) {
		return `был(а) сегодня в ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
	}
	if (diffHours < 48) {
		return `был(а) вчера в ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
	}
	return `был(а) ${date.toLocaleDateString()}`;
};

const ChatPage = () => {
	const [clients, setClients] = useState<IChatClient[]>([]);
	const [loadingClients, setLoadingClients] = useState(true);

	const [activeClient, setActiveClient] = useState<IChatClient | null>(null);
	const [messages, setMessages] = useState<IMessage[]>([]);
	const [loadingMsgs, setLoadingMsgs] = useState(false);
	const [text, setText] = useState('');
	const [sending, setSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
	}, []);

	const playNotificationSound = () => {
		if (audioRef.current) {
			audioRef.current.play().catch(e => console.error('Ошибка воспроизведения звука', e));
		}
	};

	const fetchClients = async () => {
		try {
			const res = await api.get('/api/chat-list/');

			// Проверяем, появились ли новые сообщения у кого-то (unread_count увеличился)
			const newClients: IChatClient[] = res.data;
			let hasNewUnread = false;

			clients.forEach(oldClient => {
				const match = newClients.find(c => c.client_code === oldClient.client_code);
				if (match && match.unread_count > oldClient.unread_count) {
					hasNewUnread = true;
				}
			});

			if (hasNewUnread) {
				playNotificationSound();
			}

			setClients(newClients);
		} catch (error) {
			console.error(error);
		} finally {
			setLoadingClients(false);
		}
	};

	useEffect(() => {
		fetchClients();
		const intId = setInterval(fetchClients, 5000); // Обновляем список чатов каждые 5 сек
		return () => clearInterval(intId);
	}, []);

	const fetchMessages = async (client_code: string) => {
		try {
			const res = await api.get(`/api/chat/${client_code}/`);
			const newMessages: IMessage[] = res.data;

			if (messages.length > 0 && newMessages.length > messages.length) {
				// Если появились новые сообщения и последнее сообщение не от нас
				const lastMessage = newMessages[newMessages.length - 1];
				if (lastMessage.receiver === null) {
					playNotificationSound();
				}
			}

			setMessages(newMessages);
		} catch (error) {
			console.error(error);
		} finally {
			setLoadingMsgs(false);
		}
	};

	useEffect(() => {
		if (activeClient) {
			setLoadingMsgs(true);
			fetchMessages(activeClient.client_code);
			const intId = setInterval(() => fetchMessages(activeClient.client_code), 3000); // Проверяем новые сообщения и прочитанность каждые 3 сек
			return () => clearInterval(intId);
		}
	}, [activeClient]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!text.trim() || !activeClient) return;

		setSending(true);
		try {
			await api.post(`/api/chat/${activeClient.client_code}/`, { text });
			setText('');
			await fetchMessages(activeClient.client_code);
			fetchClients();
		} catch (error) {
			toast.error('Ошибка отправки');
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="h-[calc(100vh-100px)] flex gap-4 overflow-hidden pt-4 pb-4 px-2">
			{/* Список чатов */}
			<div className="w-1/3 min-w-[250px] max-w-[350px] bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
				<div className="p-4 border-b border-slate-100 bg-slate-50/50">
					<h2 className="text-lg font-black text-slate-800">Чаты</h2>
				</div>
				<div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
					{loadingClients ? (
						<div className="flex justify-center p-10"><Loader className="animate-spin text-blue-500" /></div>
					) : clients.length === 0 ? (
						<div className="text-center text-slate-400 p-6 text-sm font-medium">Нет активных чатов</div>
					) : (
						clients.map(client => (
							<div
								key={client.client_code}
								onClick={() => setActiveClient(client)}
								className={`p-3 rounded-2xl cursor-pointer transition-colors flex items-center gap-3 ${activeClient?.client_code === client.client_code ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'}`}
							>
								<div className="w-12 h-12 bg-slate-200 rounded-full flex-shrink-0 overflow-hidden relative">
									{client.avatar ? (
										<img src={getAva(client.avatar)!} alt="" className="w-full h-full object-cover" />
									) : (
										<div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">{client.first_name?.[0] || 'C'}</div>
									)}
									{/* Индикатор онлайна (зеленая точка), если был менее 5 минут назад */}
									{formatLastSeen(client.last_message_date) === 'в сети' && (
										<div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
									)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-start mb-1">
										<h4 className="font-bold text-sm text-slate-800 truncate pr-2">{client.first_name || 'Без имени'}</h4>
										{client.last_message_date && (
											<span className="text-[10px] text-slate-400 font-medium shrink-0">
												{new Date(client.last_message_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
											</span>
										)}
									</div>
									<div className="flex justify-between items-center gap-2">
										<p className="text-xs text-slate-500 truncate font-medium">{client.last_message || '...'}</p>
										{client.unread_count > 0 && (
											<span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
												{client.unread_count}
											</span>
										)}
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Окно чата */}
			<div className="flex-1 bg-[#F8FAFC] rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden relative">
				{!activeClient ? (
					<div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white">
						<MessageCircle size={48} className="mb-4 opacity-20" />
						<p className="font-medium bg-slate-100 px-4 py-1.5 rounded-full">Выберите чат для начала общения</p>
					</div>
				) : (
					<>
						{/* Шапка чата с последним просмотром */}
						<div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-4 sticky top-0 z-10 shadow-sm">
							<button
								onClick={() => setActiveClient(null)}
								className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
							>
								<ArrowLeft size={20} />
							</button>

							<div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden">
								{activeClient.avatar ? (
									<img src={getAva(activeClient.avatar)!} alt="" className="w-full h-full object-cover" />
								) : (
									<div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">{activeClient.first_name?.[0] || 'C'}</div>
								)}
							</div>
							<div className="flex-1">
								<h3 className="font-bold text-slate-800 leading-tight">{activeClient.first_name || 'Без имени'}</h3>
								{/* СТАТУС В СЕТИ КАК В ТЕЛЕГРАМЕ */}
								<p className={`text-[11px] font-medium ${formatLastSeen(activeClient.last_message_date) === 'в сети' ? 'text-blue-500' : 'text-slate-400'}`}>
									{formatLastSeen(activeClient.last_message_date)}
								</p>
							</div>
						</div>

						{/* Сообщения */}
						<div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
							{loadingMsgs ? (
								<div className="flex justify-center p-10"><Loader className="animate-spin text-blue-500" /></div>
							) : messages.length === 0 ? (
								<div className="text-center text-slate-400 mt-10 text-sm font-medium">Здесь пока пусто</div>
							) : (
								messages.map((msg) => {
									const isMine = msg.receiver !== null; // Отправили мы (админы)

									return (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											key={msg.id}
											className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
										>
											<div className="flex items-end gap-2 max-w-[75%] relative">
												{!isMine && (
													<div className="w-6 h-6 rounded-full bg-slate-200 shrink-0 mb-1 overflow-hidden">
														{msg.sender_avatar ? (
															<img src={getAva(msg.sender_avatar)!} alt="" className="w-full h-full object-cover" />
														) : (
															<div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">C</div>
														)}
													</div>
												)}

												{/* Пузырь сообщения в стиле Telegram (время и галочки внутри) */}
												<div className={`relative px-3.5 py-2 min-w-[80px] shadow-sm ${isMine
													? 'bg-[#E3FFD4] text-slate-800 rounded-2xl rounded-br-sm' // Светло-зеленый (свой)
													: 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-bl-sm' // Белый (чужой)
													}`}>
													<p className="text-[14px] font-medium leading-relaxed pb-3 pr-2 break-words">
														{msg.text}
													</p>

													{/* Блок времени и галочек в правом нижнем углу пузыря */}
													<div className="absolute bottom-1 right-2 flex items-center gap-0.5">
														<span className="text-[10px] font-bold text-slate-400/80 mt-0.5">
															{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
														</span>
														{isMine && (
															<span className="ml-0.5">
																{msg.is_read ? (
																	<CheckCheck size={14} className="text-[#34B7F1]" /> // Две синие галочки
																) : (
																	<Check size={14} className="text-slate-400/80" /> // Одна серая галочка
																)}
															</span>
														)}
													</div>
												</div>
											</div>
										</motion.div>
									)
								})
							)}
							<div ref={messagesEndRef} />
						</div>

						{/* Ввод */}
						<div className="p-3 bg-white border-t border-slate-200">
							<form onSubmit={handleSend} className="flex items-center gap-2 bg-slate-50 rounded-full pr-1.5 pl-4 py-1.5 border border-slate-200 focus-within:border-blue-400 focus-within:bg-white transition-all">
								<input
									type="text"
									value={text}
									onChange={e => setText(e.target.value)}
									placeholder="Написать сообщение..."
									className="flex-1 bg-transparent py-2 outline-none text-sm font-medium text-slate-800"
								/>
								<button
									type="submit"
									disabled={!text.trim() || sending}
									className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shrink-0 active:scale-95 disabled:opacity-50 transition-transform shadow-md shadow-blue-200"
								>
									{sending ? <Loader className="animate-spin" size={18} /> : <Send size={18} className="ml-0.5" />}
								</button>
							</form>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default ChatPage;