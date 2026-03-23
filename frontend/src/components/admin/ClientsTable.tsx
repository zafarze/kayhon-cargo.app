// src/components/admin/ClientsTable.tsx
import { motion } from 'framer-motion';
import { Phone, Calendar, Package, User, Edit, Trash2, Plus } from 'lucide-react';
import { IClient } from '../../types'; // Импортируем тип клиента

// Описываем, какие пропсы принимает компонент
interface ClientsTableProps {
	clients: IClient[];
	totalClients?: number;
	onEdit: (client: IClient) => void;
	onDelete: (client: IClient) => void;
	onAddClick: () => void;
}

const ClientsTable = ({ clients, totalClients, onEdit, onDelete, onAddClick }: ClientsTableProps) => {
	// Если клиентов нет, можно вернуть null или заглушку, но таблица пустая тоже ок

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors"
		>
			{/* --- ШАПКА ТАБЛИЦЫ --- */}
			<div className="p-8 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 transition-colors">
				<div>
					<h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
						<User className="text-blue-500 dark:text-blue-400" size={24} />
						Клиенты
					</h2>
					<p className="text-gray-400 dark:text-gray-500 text-sm mt-1">База зарегистрированных пользователей</p>
				</div>
				<div className="flex items-center gap-4">
					<div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl font-bold text-sm">
						Всего: {totalClients ?? clients.length}
					</div>
					<button
						onClick={onAddClick}
						className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-500/30"
					>
						<Plus size={18} />
						Добавить клиента
					</button>
				</div>
			</div>

			{/* --- ТАБЛИЦА --- */}
			<div className="overflow-x-auto">
				<table className="w-full text-left border-collapse">
					<thead>
						<tr className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider font-semibold border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/50">
							<th className="p-6 pl-8">Клиент</th>
							<th className="p-6">Контакты</th>
							<th className="p-6">Адрес</th>
							<th className="p-6 text-center">Посылки</th>
							<th className="p-6 text-right">Регистрация / Вход</th>
							<th className="p-6 text-center pr-8">Действия</th>
						</tr>
					</thead>
					<tbody className="text-sm text-gray-600 dark:text-gray-300">
						{clients.length === 0 ? (
							<tr>
								<td colSpan={6} className="p-8 text-center text-gray-400 dark:text-gray-500 font-medium">
									Список клиентов пуст
								</td>
							</tr>
						) : (
							clients.map((client, index) => (
								<motion.tr
									key={client.id}
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: index * 0.1 }}
									className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-50 dark:border-slate-800 last:border-0 group cursor-default"
								>
									{/* Имя и Код */}
									<td className="p-5 pl-8">
										<div className="flex items-center gap-4">
											{/* Аватар с первой буквой */}
											<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-50 text-blue-600 flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-110 transition-transform duration-300">
												{client.first_name ? client.first_name[0].toUpperCase() : 'C'}
											</div>
											<div>
												<div className="font-bold text-gray-900 dark:text-white text-base">
													{client.first_name || 'Без имени'}
												</div>
												<div className="font-mono text-xs text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg mt-1 inline-block font-bold border border-transparent dark:border-blue-900/50">
													{client.client_code}
												</div>
											</div>
										</div>
									</td>

									{/* Телефон */}
									<td className="p-5">
										<div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium bg-gray-50 dark:bg-slate-800 w-fit px-3 py-1.5 rounded-lg border border-transparent dark:border-slate-700">
											<Phone size={14} className="text-gray-400 dark:text-gray-500" />
											{client.phone_number}
										</div>
									</td>

									{/* Адрес */}
									<td className="p-5 text-gray-500 dark:text-gray-400 font-medium">
										{client.address || <span className="text-gray-300 dark:text-slate-600 italic">Не указан</span>}
									</td>

									{/* Кол-во посылок */}
									<td className="p-5 text-center">
										<span className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-900/50">
											<Package size={14} /> {client.packages_count} шт.
										</span>
									</td>

									{/* Дата регистрации и последний вход */}
									<td className="p-5 text-right text-gray-400 dark:text-gray-500">
										<div className="flex flex-col items-end gap-1 text-xs font-medium">
											<div className="flex items-center gap-2">
												<Calendar size={14} className="text-gray-300 dark:text-slate-600" />
												{new Date(client.date_joined).toLocaleDateString()}
											</div>
											{client.last_login && (
												<div className="text-green-500 dark:text-green-600 font-medium">
													Был(а): {new Date(client.last_login).toLocaleDateString()}
												</div>
											)}
										</div>
									</td>

									{/* Действия */}
									<td className="p-5 text-center pr-8">
										<div className="flex items-center justify-center gap-2">
											<button
												onClick={() => onEdit(client)}
												className="p-2 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
												title="Редактировать клиента"
											>
												<Edit size={18} />
											</button>
											<button
												onClick={() => onDelete(client)}
												className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
												title="Удалить клиента"
											>
												<Trash2 size={18} />
											</button>
										</div>
									</td>
								</motion.tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</motion.div>
	);
};

export default ClientsTable;