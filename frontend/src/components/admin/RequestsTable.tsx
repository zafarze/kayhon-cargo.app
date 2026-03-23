import React from 'react';
import { motion } from 'framer-motion';
import { Phone, CheckCircle } from 'lucide-react';
import { api } from '../../api'; // <--- Наш клиент
import toast from 'react-hot-toast'; // <--- Красивые уведомления
import { IApplication } from '../../types';

interface RequestsTableProps {
	requests: IApplication[];
	refreshData: () => void;
}

const RequestsTable = ({ requests, refreshData }: RequestsTableProps) => {

	const handleStatusChange = async (id: number, newStatus: string) => {
		// Показываем лоадер в уведомлении
		const toastId = toast.loading('Обновление статуса...');
		try {
			await api.patch('/api/applications/', { id, status: newStatus });
			toast.success('Статус обновлен!', { id: toastId });
			refreshData(); // Обновляем список
		} catch (e) {
			console.error(e);
			toast.error("Не удалось обновить статус", { id: toastId });
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'new': return <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><span className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></span> Новая</span>;
			case 'contacted': return <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold w-fit">В работе</span>;
			case 'completed': return <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold w-fit">Завершен</span>;
			default: return <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold w-fit">Отмена</span>;
		}
	};

	return (
		<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
			<div className="p-8 border-b border-gray-50">
				<h2 className="text-xl font-bold text-gray-800">Входящие заявки 📨</h2>
				<p className="text-gray-400 text-sm mt-1">Клиенты, которые ждут звонка</p>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-left border-collapse">
					<thead className="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-wider">
						<tr>
							<th className="p-6 pl-8">Имя клиента</th>
							<th className="p-6">Телефон</th>
							<th className="p-6">Сообщение</th>
							<th className="p-6">Статус</th>
							<th className="p-6 text-right pr-8">Действия</th>
						</tr>
					</thead>
					<tbody className="text-sm">
						{requests.length === 0 ? (
							<tr><td colSpan={5} className="p-8 text-center text-gray-400">Новых заявок нет</td></tr>
						) : (
							requests.map((req) => (
								<tr key={req.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors last:border-0">
									<td className="p-6 pl-8 font-bold text-gray-800">{req.full_name}</td>
									<td className="p-6 text-blue-600 font-medium">{req.phone_number}</td>
									<td className="p-6 text-gray-500 max-w-xs truncate" title={req.description}>{req.description || "—"}</td>
									<td className="p-6">{getStatusBadge(req.status)}</td>
									<td className="p-6 text-right pr-8 flex justify-end gap-2">
										{req.status === 'new' && (
											<button onClick={() => handleStatusChange(req.id, 'contacted')} className="p-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors" title="Взять в работу">
												<Phone size={18} />
											</button>
										)}
										{req.status !== 'completed' && (
											<button onClick={() => handleStatusChange(req.id, 'completed')} className="p-2 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors" title="Завершить">
												<CheckCircle size={18} />
											</button>
										)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</motion.div>
	);
};

export default RequestsTable;