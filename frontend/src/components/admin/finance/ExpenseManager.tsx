// src/components/admin/finance/ExpenseManager.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Receipt, Search, Calendar, DollarSign, X } from 'lucide-react';
import { api } from '../../../api';
import toast from 'react-hot-toast';
import { IExpense } from '../../../types';
import { customConfirm } from '../../../utils/customConfirm';

interface ExpenseManagerProps {
	onExpenseAdded: () => void;
}

const ExpenseManager = ({ onExpenseAdded }: ExpenseManagerProps) => {
	const [expenses, setExpenses] = useState<IExpense[]>([]);
	const [loading, setLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const [formData, setFormData] = useState({ title: '', amount: '', description: '' });
	const [isSubmitting, setIsSubmitting] = useState(false);

	const fetchExpenses = async () => {
		try {
			const res = await api.get('/api/finance/expenses/');
			setExpenses(res.data);
		} catch (error) {
			toast.error('Ошибка загрузки расходов');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchExpenses();
	}, []);

	const handleDelete = (id: number) => {
		customConfirm('Точно удалить этот расход?', async () => {
			try {
				await api.delete(`/api/finance/expenses/${id}/`);
				toast.success('Расход удален');
				fetchExpenses();
				onExpenseAdded(); // refresh dashboard stats
			} catch {
				toast.error('Ошибка удаления');
			}
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.title || !formData.amount) {
			toast.error('Заполните название и сумму');
			return;
		}

		setIsSubmitting(true);
		try {
			await api.post('/api/finance/expenses/', {
				title: formData.title,
				amount: parseFloat(formData.amount),
				description: formData.description
			});
			toast.success('Расход добавлен!');
			setFormData({ title: '', amount: '', description: '' });
			setIsModalOpen(false);
			fetchExpenses();
			onExpenseAdded(); // update global stats
		} catch (error) {
			toast.error('Ошибка добавления');
		} finally {
			setIsSubmitting(false);
		}
	};

	const filteredExpenses = expenses.filter(exp => 
		exp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
		(exp.description && exp.description.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	return (
		<div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100/50 border border-gray-100 flex flex-col h-full relative overflow-hidden">
			{/* Хедер */}
			<div className="flex justify-between items-start mb-8 relative z-10">
				<div className="flex items-center gap-4">
					<div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-inner">
						<Receipt size={24} />
					</div>
					<div>
						<h3 className="text-gray-900 font-bold text-xl">Расходы</h3>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
							Учет затрат
						</p>
					</div>
				</div>
				<button
					onClick={() => setIsModalOpen(true)}
					className="bg-gray-900 hover:bg-black text-white p-3 rounded-2xl transition-transform hover:scale-105 shadow-xl shadow-gray-200"
				>
					<Plus size={20} />
				</button>
			</div>

			{/* Поиск */}
			<div className="relative mb-6">
				<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
				<input
					type="text"
					placeholder="Поиск по расходам..."
					value={searchQuery}
					onChange={e => setSearchQuery(e.target.value)}
					className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
				/>
			</div>

			{/* Список расходов */}
			<div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
				{loading ? (
					<div className="text-center py-10 text-gray-400 font-medium animate-pulse">Загрузка...</div>
				) : filteredExpenses.length === 0 ? (
					<div className="text-center py-10 text-gray-400 font-medium">
						{searchQuery ? 'Ничего не найдено' : 'Расходов пока нет'}
					</div>
				) : (
					filteredExpenses.map((expense) => (
						<div key={expense.id} className="group flex items-center justify-between p-4 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 rounded-2xl transition-all shadow-none hover:shadow-lg hover:shadow-gray-100/50">
							<div>
								<p className="font-bold text-gray-900">{expense.title}</p>
								<div className="flex items-center gap-2 mt-1">
									<p className="text-xs font-bold text-gray-400 flex items-center gap-1">
										<Calendar size={12} />
										{expense.date}
									</p>
									{expense.description && (
										<p className="text-[10px] font-medium text-gray-400 truncate max-w-[150px]">
											• {expense.description}
										</p>
									)}
								</div>
							</div>
							<div className="flex items-center gap-4">
								<p className="font-black text-red-500 whitespace-nowrap">
									- {Number(expense.amount).toLocaleString()} с.
								</p>
								<button
									onClick={() => expense.id && handleDelete(expense.id)}
									className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-xl"
								>
									<Trash2 size={16} />
								</button>
							</div>
						</div>
					))
				)}
			</div>

			{/* Модалка добавления */}
			<AnimatePresence>
				{isModalOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 20 }}
							className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden"
						>
							<div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-white text-red-500 rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
										<DollarSign size={20} />
									</div>
									<h2 className="text-xl font-black text-gray-900">Новый расход</h2>
								</div>
								<button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200/50 rounded-full text-gray-400 transition-colors">
									<X size={20} />
								</button>
							</div>

							<form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Название / Категория *</label>
									<input
										type="text"
										required
										value={formData.title}
										onChange={e => setFormData({...formData, title: e.target.value})}
										placeholder="Например: Аренда офиса"
										className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 font-bold text-gray-900 outline-none focus:border-blue-400 focus:bg-white placeholder:text-gray-300 transition-colors"
									/>
								</div>

								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Сумма (сомони) *</label>
									<input
										type="number"
										step="0.01"
										required
										value={formData.amount}
										onChange={e => setFormData({...formData, amount: e.target.value})}
										placeholder="0.00"
										className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 font-bold text-gray-900 outline-none focus:border-blue-400 focus:bg-white placeholder:text-gray-300 transition-colors"
									/>
								</div>

								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Примечание</label>
									<textarea
										value={formData.description}
										onChange={e => setFormData({...formData, description: e.target.value})}
										placeholder="За какой месяц, кому отдали и т.д."
										className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 font-bold text-gray-900 outline-none focus:border-blue-400 focus:bg-white placeholder:text-gray-300 transition-colors resize-none h-24 custom-scrollbar"
									/>
								</div>

								<div className="pt-4">
									<button
										type="submit"
										disabled={isSubmitting}
										className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl shadow-gray-200 transition-all active:scale-[0.98] disabled:opacity-50"
									>
										{isSubmitting ? 'Сохранение...' : 'Добавить расход'}
									</button>
								</div>
							</form>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default ExpenseManager;
