// src/components/admin/PackagesTable.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Package, MapPin, Truck, CheckCircle, Clock,
	Search, ChevronLeft, ChevronRight, Filter, RefreshCw,
	Edit, Trash2, Loader, ChevronDown, ChevronUp, CalendarDays
} from 'lucide-react';
import { api } from '../../api';
import { IPackage } from '../../types';
import toast from 'react-hot-toast';
import EditPackageModal from './EditPackageModal';
import ConfirmModal from './ConfirmModal';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

interface PackagesTableProps {
	packages?: IPackage[];
	isDashboard?: boolean;
	initialStatus?: string;
}

const PackagesTable = ({ packages: initialPackages = [], isDashboard = false, initialStatus = '' }: PackagesTableProps) => {
	// --- STATE ---
	const [data, setData] = useState<IPackage[]>(initialPackages);
	const [loading, setLoading] = useState(false);

	// Фильтры
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState(initialStatus);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);

	// Модалка Редактирования
	const [editPkg, setEditPkg] = useState<IPackage | null>(null);
	const [isEditOpen, setIsEditOpen] = useState(false);

	// Стейты для удаления
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [pkgToDelete, setPkgToDelete] = useState<{ id: number, track: string } | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// --- НОВОЕ: Стейт для раскрытия истории ---
	const [expandedRow, setExpandedRow] = useState<number | null>(null);

	// --- EFFECT ---
	useEffect(() => {
		if (isDashboard) {
			setData(initialPackages);
		}
	}, [initialPackages, isDashboard]);

	// Загрузка с сервера
	const fetchPackages = async (showLoading = true) => {
		if (isDashboard) return;

		if (showLoading) setLoading(true);
		try {
			const response = await api.get(`/api/packages/all/`, {
				params: {
					page: page,
					search: search,
					status: statusFilter || undefined,
					page_size: 50
				}
			});

			setData(response.data.results);
			setTotalCount(response.data.count);
			setTotalPages(Math.ceil(response.data.count / 50));
		} catch (error) {
			console.error("Ошибка:", error);
		} finally {
			if (showLoading) setLoading(false);
		}
	};

	useEffect(() => {
		if (!isDashboard) {
			const timer = setTimeout(() => fetchPackages(true), 300);
			return () => clearTimeout(timer);
		}
	}, [page, search, statusFilter, isDashboard]);

	useAutoRefresh(() => {
		if (!isDashboard && !isEditOpen && !deleteModalOpen) {
			fetchPackages(false);
		}
	}, 15000);

	// --- ЛОГИКА ---
	const toggleRow = (id: number) => {
		setExpandedRow(prev => prev === id ? null : id);
	};

	const onClickDelete = (id: number, track: string) => {
		setPkgToDelete({ id, track });
		setDeleteModalOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!pkgToDelete) return;
		setIsDeleting(true);
		try {
			await api.delete(`/api/packages/${pkgToDelete.id}/delete/`);
			toast.success('Посылка удалена');
			setDeleteModalOpen(false);
			fetchPackages();
		} catch (e) {
			console.error(e);
			toast.error("Ошибка удаления");
		} finally {
			setIsDeleting(false);
		}
	};

	const openEdit = (pkg: IPackage) => {
		setEditPkg(pkg);
		setIsEditOpen(true);
	};

	// --- HELPER FUNCTIONS ---
	const getStatusConfig = (status: string) => {
		switch (status) {
			case 'china_warehouse': return { style: 'bg-orange-50 text-orange-600 border-orange-100', icon: <Package size={14} />, label: 'На складе (Кит)' };
			case 'in_transit': return { style: 'bg-blue-50 text-blue-600 border-blue-100', icon: <Truck size={14} />, label: 'В пути' };
			case 'arrived_dushanbe': return { style: 'bg-purple-50 text-purple-600 border-purple-100', icon: <MapPin size={14} />, label: 'Прибыл (Душ)' };
			case 'delivered': return { style: 'bg-green-50 text-green-600 border-green-100', icon: <CheckCircle size={14} />, label: 'Выдан' };
			default: return { style: 'bg-gray-50 text-gray-600 border-gray-100', icon: <Clock size={14} />, label: 'Ожидается' };
		}
	};

	const tabs = [
		{ id: '', label: 'Все' },
		{ id: 'china_warehouse', label: '🇨🇳 Склад Китай' },
		{ id: 'in_transit', label: '🚚 В пути' },
		{ id: 'arrived_dushanbe', label: '🇹🇯 Склад Душанбе' },
		{ id: 'delivered', label: '✅ Выдано' },
	];

	return (
		<div className="h-full flex flex-col space-y-6">
			{!isDashboard && (
				<div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center transition-colors">
					<div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1">
						{tabs.map(tab => (
							<button
								key={tab.id}
								onClick={() => { setStatusFilter(tab.id); setPage(1); setExpandedRow(null); }}
								className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${statusFilter === tab.id ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-md dark:shadow-blue-900/40' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 hover:bg-gray-50'
									}`}
							>
								{tab.label}
							</button>
						))}
					</div>
					<div className="relative w-full md:w-72">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
						<input
							type="text"
							placeholder="Поиск трека..."
							className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-200 dark:focus:border-blue-500/50 text-gray-900 dark:text-white transition-all"
							value={search}
							onChange={(e) => { setSearch(e.target.value); setPage(1); setExpandedRow(null); }}
						/>
					</div>
				</div>
			)}

			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden flex-1 flex flex-col transition-colors"
			>
				{isDashboard && (
					<div className="p-6 border-b border-gray-50 flex justify-between items-center">
						<h2 className="text-xl font-bold flex items-center gap-2"><Package className="text-blue-600" /> Недавние посылки</h2>
					</div>
				)}

				<div className="overflow-x-auto flex-1 custom-scrollbar">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/50 sticky top-0 backdrop-blur-sm z-10">
								<th className="p-5 pl-8 w-12 text-center">№</th> {/* НОВАЯ КОЛОНКА */}
								<th className="p-5">Трек-код</th>
								<th className="p-5">Клиент</th>
								<th className="p-5">Описание</th>
								<th className="p-5">Статус</th>
								<th className="p-5">Полка</th>
								<th className="p-5">Вес / Цена</th>
								{!isDashboard && <th className="p-5 text-right pr-8">Действия</th>}
							</tr>
						</thead>
						<tbody className="text-sm">
							{loading ? (
								<tr><td colSpan={8} className="p-10 text-center text-gray-400 dark:text-gray-500 font-bold"><Loader className="animate-spin mx-auto mb-2" />Загрузка...</td></tr>
							) : data.length === 0 ? (
								<tr><td colSpan={8} className="p-10 text-center text-gray-400 dark:text-gray-500 font-bold">Ничего не найдено</td></tr>
							) : (
								data.map((pkg, i) => {
									const config = getStatusConfig(pkg.status);
									// @ts-ignore
									let clientName = pkg.client_info?.first_name || pkg.client_info?.client_code || pkg.client || "—";
									if (clientName === "Неизвестный (Авто)" && pkg.client_info?.client_code) {
										clientName = `ID: ${pkg.client_info.client_code}`;
									} else if (pkg.client_info?.client_code && pkg.client_info?.client_code !== 'UNKNOWN') {
										clientName = `${clientName} (${pkg.client_info.client_code})`;
									}
									const isExpanded = expandedRow === pkg.id;

									// --- Расчет нумерации ---
									const itemIndex = isDashboard ? i + 1 : (page - 1) * 50 + i + 1;

									return (
										<React.Fragment key={pkg.id}>
											<tr
												onClick={() => toggleRow(pkg.id)}
												className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-50 dark:border-slate-800 cursor-pointer group ${isExpanded ? 'bg-blue-50/10 dark:bg-blue-900/10' : ''}`}
											>
												{/* НОМЕР */}
												<td className="p-5 pl-8 text-center text-gray-400 dark:text-gray-500 font-bold">
													{itemIndex}
												</td>

												<td className="p-5">
													<div className="flex items-center gap-2">
														<span className={`p-1 rounded-md transition-colors ${isExpanded ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-slate-800 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
															{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
														</span>
														<span className="font-mono font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-sm group-hover:bg-white dark:group-hover:bg-slate-700 border border-transparent group-hover:border-blue-200 dark:group-hover:border-blue-500/50 transition-all">
															{pkg.track_code}
														</span>
													</div>
												</td>
												<td className="p-5 font-bold text-gray-600 dark:text-gray-300">{String(clientName)}</td>
												<td className="p-5 font-medium text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{pkg.description || '—'}</td>
												<td className="p-5">
													<span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${config.style}`}>
														{config.icon} {config.label}
													</span>
												</td>
												<td className="p-5 font-bold text-gray-500 dark:text-gray-400">{pkg.shelf_location || '—'}</td>
												<td className="p-5">
													<div className="flex flex-col">
														<span className="font-bold text-gray-700 dark:text-gray-300">{pkg.weight} кг</span>
														<span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">{pkg.total_price} с.</span>
													</div>
												</td>

												{/* КНОПКИ ДЕЙСТВИЙ */}
												{!isDashboard && (
													<td className="p-5 text-right pr-8">
														<div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
															<button
																onClick={(e) => { e.stopPropagation(); openEdit(pkg); }} // stopPropagation чтобы не открывалась история при клике на кнопку
																className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
																title="Редактировать"
															>
																<Edit size={16} />
															</button>
															<button
																onClick={(e) => { e.stopPropagation(); onClickDelete(pkg.id, pkg.track_code); }}
																className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
																title="Удалить"
															>
																<Trash2 size={16} />
															</button>
														</div>
													</td>
												)}
											</tr>

											{/* --- РАСКРЫВАЮЩАЯСЯ ИСТОРИЯ --- */}
											<AnimatePresence>
												{isExpanded && (
													<tr>
														<td colSpan={isDashboard ? 7 : 8} className="p-0 border-b border-gray-100 dark:border-slate-800">
															<motion.div
																initial={{ height: 0, opacity: 0 }}
																animate={{ height: "auto", opacity: 1 }}
																exit={{ height: 0, opacity: 0 }}
																className="bg-gray-50/80 dark:bg-slate-800/50 overflow-hidden shadow-inner-white dark:shadow-none"
															>
																<div className="p-6 pl-14 md:pl-24">
																	<h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
																		<CalendarDays size={16} className="text-blue-500" />
																		История перемещений:
																	</h4>

																	{/* Таймлайн */}
																	{pkg.history && pkg.history.length > 0 ? (
																		<div className="flex flex-col gap-4 border-l-2 border-blue-200 pl-6 ml-2 py-1">
																			{pkg.history.map((hist: any, hIdx: number) => (
																				<div key={hIdx} className="relative">
																					{/* Точка на линии */}
																					<div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm ring-2 ring-blue-100"></div>

																					<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
																						<span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[150px]">
																							{hist.status_display || hist.status}
																						</span>
																						<span className="text-xs font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-gray-100 dark:border-slate-700 shadow-sm inline-block">
																							{new Date(hist.created_at).toLocaleString('ru-RU')}
																						</span>
																						<span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
																							📍 {hist.location}
																						</span>
																					</div>
																				</div>
																			))}
																		</div>
																	) : (
																		<p className="text-sm text-gray-500 italic">История пока пуста</p>
																	)}
																</div>
															</motion.div>
														</td>
													</tr>
												)}
											</AnimatePresence>
										</React.Fragment>
									);
								})
							)}
						</tbody>
					</table>
				</div>

				{/* ПАГИНАЦИЯ */}
				{!isDashboard && totalPages > 1 && (
					<div className="p-4 border-t border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30 transition-colors">
						<button onClick={() => { setPage(p => Math.max(1, p - 1)); setExpandedRow(null); }} disabled={page === 1} className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm disabled:opacity-50 transition-all">
							<ChevronLeft size={16} /> Назад
						</button>
						<div className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
							Страница <span className="text-gray-900 dark:text-white text-sm">{page}</span> из {totalPages}
						</div>
						<button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setExpandedRow(null); }} disabled={page === totalPages} className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm disabled:opacity-50 transition-all">
							Вперед <ChevronRight size={16} />
						</button>
					</div>
				)}
			</motion.div>

			{/* --- МОДАЛКИ --- */}
			<EditPackageModal
				isOpen={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				pkg={editPkg}
				onSuccess={fetchPackages}
			/>

			<ConfirmModal
				isOpen={deleteModalOpen}
				onClose={() => setDeleteModalOpen(false)}
				onConfirm={handleConfirmDelete}
				title="Удалить посылку?"
				message={`Вы действительно хотите удалить посылку ${pkgToDelete?.track}? Это действие нельзя отменить.`}
				confirmText="Да, удалить"
				isDanger={true}
				isLoading={isDeleting}
			/>
		</div>
	);
};

export default PackagesTable;