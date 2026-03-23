import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, User as UserIcon, Loader, Check, CheckCheck } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

interface IMessage {
	id: number;
	sender: number;
	sender_name: string;
	sender_avatar?: string | null;
	receiver: number | null;
	text: string;
	created_at: string;
	is_read: boolean;
}

export const ChatSection = ({ clientCode }: { clientCode?: string }) => {
	console.log(clientCode);
	const [messages, setMessages] = useState<IMessage[]>([]);
	const [text, setText] = useState('');
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Используем clientCode чтобы получить сообщения клиента, если это админ.
	// Если это сам клиент в TG, clientCode может быть, а на бэке он по токену берет
	const endpoint = '/api/chat/';

	const fetchMessages = async () => {
		try {
			const res = await api.get(endpoint);
			setMessages(res.data);
		} catch (error) {
			console.error('Ошибка загрузки сообщений', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchMessages();
		// Простой поллинг для новых сообщений каждые 5 сек
		const interval = setInterval(fetchMessages, 5000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!text.trim()) return;

		setSending(true);
		try {
			await api.post(endpoint, { text });
			setText('');
			await fetchMessages();
		} catch (err) {
			toast.error('Ошибка отправки');
		} finally {
			setSending(false);
		}
	};

	if (loading) return <div className="flex justify-center p-10"><Loader className="animate-spin text-blue-500" /></div>;

	return (
		<div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 relative">
			{/* Хедер чата */}
			<div className="bg-white px-4 py-3 shadow-sm border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
						<UserIcon size={20} />
					</div>
					<div>
						<h3 className="font-bold text-slate-800 leading-tight">Служба поддержки</h3>
						<p className="text-[10px] text-green-500 font-bold">Онлайн</p>
					</div>
				</div>
			</div>

			{/* Сообщения */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{messages.length === 0 ? (
					<div className="text-center text-slate-400 mt-10 text-sm font-medium">
						Нет сообщений. Напишите нам!
					</div>
				) : (
					messages.map((msg) => {
						// В TG мини-аппе все отправленные клиентом сообщения будут справа
						// Нам нужно определить, кто отправитель. У клиента receiver = null. 
						// Если sender_name совпадает с нашим именем (или просто по логике бэка), определяем:
						// Если receiver == null, значит это сообщение ОТ клиента админу. Т.к. мы в приложении клиента, то это НАШЕ сообщение (справа).
						// ВАЖНО: правильнее передавать свой ID, но для простоты если receiver=null (мы отправили в ТП) или sender = client.
						// Будем считать, что если sender_name 'Админ' - это админ. Иначе клиент.
						// Или просто receiver === null - это значит клиент отправил админу.
						const isMine = msg.receiver === null;

						return (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								key={msg.id}
								className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
							>
								<div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm'}`}>
									<p className="text-sm font-medium leading-snug">{msg.text}</p>
								</div>
								<div className="flex items-center gap-1 mt-1">
									<span className="text-[10px] text-slate-400 font-bold">
										{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
									</span>
									{isMine && (
										<span className="ml-0.5">
											{msg.is_read ? (
												<CheckCheck size={14} className="text-[#34B7F1]" />
											) : (
												<Check size={14} className="text-slate-400" />
											)}
										</span>
									)}
								</div>
							</motion.div>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Ввод */}
			<div className="p-3 bg-white border-t border-slate-100 pb-20">
				<form onSubmit={handleSend} className="flex items-center gap-2 bg-slate-50 rounded-full pr-2 pl-4 py-1 border border-slate-100 focus-within:border-blue-300 focus-within:bg-white transition-colors">
					<input
						type="text"
						value={text}
						onChange={e => setText(e.target.value)}
						placeholder="Сообщение..."
						className="flex-1 bg-transparent py-2 outline-none text-sm font-medium text-slate-800"
					/>
					<button
						type="submit"
						disabled={!text.trim() || sending}
						className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0 active:scale-95 disabled:opacity-50 transition-all"
					>
						{sending ? <Loader className="animate-spin" size={18} /> : <Send size={18} className="ml-0.5" />}
					</button>
				</form>
			</div>
		</div>
	);
};
