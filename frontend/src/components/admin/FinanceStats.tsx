import { motion } from 'framer-motion';
import { Wallet, Package, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { IStats } from '../../types';
import RevenueChart from './finance/RevenueChart';
import TopClientsLeaderboard from './finance/TopClientsLeaderboard';
import ExpenseManager from './finance/ExpenseManager';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { Save, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FinanceStatsProps {
	stats: IStats | null;
	onRefresh: () => void;
}

const FinanceStats = ({ stats, onRefresh }: FinanceStatsProps) => {
	// Безопасное получение значений
	const totalMoney = stats?.total_money || 0;
	const unpaidDebt = stats?.unpaid_debt || 0;
	const totalExpenses = stats?.total_expenses || 0;
	const netProfit = stats?.net_profit || 0;
	const totalPackages = stats?.total_packages || 0;
	const totalWeight = stats?.total_weight || 0;
	const avgPricePerKg = stats?.avg_price_per_kg || 0;

	const [companySettings, setCompanySettings] = useState({
		price_china_dushanbe: 4.5,
		price_dushanbe_home: 15.0,
		kg_per_cube: 0,
		price_per_cube: 0
	});
	const [isSavingSettings, setIsSavingSettings] = useState(false);

	useEffect(() => {
		api.get('/api/settings/').then(res => {
			if (res.data) {
				setCompanySettings({
					price_china_dushanbe: res.data.price_china_dushanbe || 4.5,
					price_dushanbe_home: res.data.price_dushanbe_home || 15.0,
					kg_per_cube: res.data.kg_per_cube || 0,
					price_per_cube: res.data.price_per_cube || 0,
				});
			}
		}).catch(console.error);
	}, []);

	const handleSaveSettings = async () => {
		setIsSavingSettings(true);
		const toastId = toast.loading('Сохранение тарифов...');
		try {
			await api.patch('/api/settings/', {
				price_china_dushanbe: companySettings.price_china_dushanbe,
				price_dushanbe_home: companySettings.price_dushanbe_home,
				kg_per_cube: companySettings.kg_per_cube,
				price_per_cube: companySettings.price_per_cube,
			});
			toast.success('Тарифы успешно обновлены!', { id: toastId });
			onRefresh(); // Refresh stats in case it affects anything
		} catch (error) {
			console.error(error);
			toast.error('Ошибка при сохранении', { id: toastId });
		} finally {
			setIsSavingSettings(false);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6 }}
			className="space-y-6"
		>
			{/* Верхний ряд виджетов (Общая картина) */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

				{/* 1. Общая Выручка */}
				<div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-300/50 relative overflow-hidden group">
					<div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
					<div className="relative z-10 flex justify-between items-start mb-6">
						<div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
							<Wallet size={24} className="text-white" />
						</div>
					</div>
					<div className="relative z-10">
						<p className="text-blue-100 font-bold mb-1 uppercase tracking-widest text-xs">Общая выручка</p>
						<h2 className="text-3xl font-black tracking-tight">{totalMoney.toLocaleString()} с.</h2>
					</div>
				</div>

				{/* 2. Долги / На складе */}
				<div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100/50 border border-gray-100 relative overflow-hidden group">
					<div className="flex justify-between items-start mb-6">
						<div className="bg-orange-50 p-3 rounded-2xl">
							<TrendingDown size={24} className="text-orange-500" />
						</div>
					</div>
					<div>
						<p className="text-gray-400 font-bold mb-1 uppercase tracking-widest text-xs">Долги клиентов</p>
						<h2 className="text-3xl font-black tracking-tight text-gray-900">{unpaidDebt.toLocaleString()} с.</h2>
					</div>
				</div>

				{/* 3. Оплаченные расходы */}
				<div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100/50 border border-gray-100 relative overflow-hidden group">
					<div className="flex justify-between items-start mb-6">
						<div className="bg-red-50 p-3 rounded-2xl">
							<TrendingDown size={24} className="text-red-500" />
						</div>
					</div>
					<div>
						<p className="text-gray-400 font-bold mb-1 uppercase tracking-widest text-xs">Расходы компании</p>
						<h2 className="text-3xl font-black tracking-tight text-red-500">-{totalExpenses.toLocaleString()} с.</h2>
					</div>
				</div>

				{/* 4. ЧИСТАЯ ПРИБЫЛЬ */}
				<div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-300/50 relative overflow-hidden group">
					<div className="absolute bottom-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mb-10 transition-transform group-hover:scale-150 duration-700"></div>
					<div className="relative z-10 flex justify-between items-start mb-6">
						<div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
							<TrendingUp size={24} className="text-white" />
						</div>
					</div>
					<div className="relative z-10">
						<p className="text-emerald-100 font-bold mb-1 uppercase tracking-widest text-xs">Чистая Прибыль</p>
						<h2 className="text-3xl font-black tracking-tight">{netProfit.toLocaleString()} с.</h2>
					</div>
				</div>

			</div>

			{/* Метрики объема */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
					<div className="p-4 bg-gray-50 rounded-2xl text-gray-500"><Package size={24} /></div>
					<div>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Перевезено посылок</p>
						<p className="text-2xl font-black text-gray-900">{totalPackages} шт</p>
					</div>
				</div>
				<div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
					<div className="p-4 bg-gray-50 rounded-2xl text-gray-500"><Scale size={24} /></div>
					<div>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Общий вес</p>
						<p className="text-2xl font-black text-gray-900">{totalWeight.toLocaleString()} кг</p>
					</div>
				</div>
				<div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
					<div className="p-4 bg-gray-50 rounded-2xl text-gray-500"><TrendingUp size={24} /></div>
					<div>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Средний доход</p>
						<p className="text-2xl font-black text-gray-900">{avgPricePerKg.toFixed(2)} с. / кг</p>
					</div>
				</div>
			</div>

			{/* Средний ряд: График и Топ Клиенты */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="col-span-1 lg:col-span-2">
					<RevenueChart data={stats?.revenue_by_date || []} />
				</div>
				<div className="col-span-1">
					<TopClientsLeaderboard clients={stats?.top_clients || []} />
				</div>
			</div>

			{/* Нижний ряд: Учет расходов */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="col-span-1">
					<ExpenseManager onExpenseAdded={onRefresh} />
				</div>
				<div className="col-span-1">
					<div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
						<h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">Управление тарифами (Глобально)</h3>

						<div className="space-y-4 flex-1">
							<div className="space-y-2">
								<label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Цена за доставку Китай - Душанбе (с. / кг)</label>
								<div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex items-center focus-within:bg-white focus-within:border-blue-300 transition-colors">
									<input
										type="number" step="0.01"
										value={companySettings.price_china_dushanbe}
										onChange={e => setCompanySettings({ ...companySettings, price_china_dushanbe: parseFloat(e.target.value) || 0 })}
										className="bg-transparent outline-none w-full font-black text-blue-600 placeholder-gray-400"
									/>
								</div>
								<p className="text-[10px] text-gray-400 ml-2 leading-tight">Эта цена используется в калькуляторе и при добавлении новых посылок. При изменении она обновится для всех неоплаченных посылок.</p>
							</div>

							<div className="space-y-2 pt-2">
								<label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Цена доставки по Душанбе до двери (с.)</label>
								<div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex items-center focus-within:bg-white focus-within:border-orange-300 transition-colors">
									<input
										type="number" step="0.1"
										value={companySettings.price_dushanbe_home}
										onChange={e => setCompanySettings({ ...companySettings, price_dushanbe_home: parseFloat(e.target.value) || 0 })}
										className="bg-transparent outline-none w-full font-black text-orange-600 placeholder-gray-400"
									/>
								</div>
								<p className="text-[10px] text-gray-400 ml-2 leading-tight">Эта сумма будет автоматически прибавляться к стоимости посылок при заказе курьерской доставки до двери.</p>
							</div>

							<div className="space-y-2 pt-2">
								<label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Плотность (кг за м³)</label>
								<div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex items-center focus-within:bg-white focus-within:border-purple-300 transition-colors">
									<input
										type="number" step="0.01"
										value={companySettings.kg_per_cube}
										onChange={e => setCompanySettings({ ...companySettings, kg_per_cube: parseFloat(e.target.value) || 0 })}
										className="bg-transparent outline-none w-full font-black text-purple-600 placeholder-gray-400"
									/>
								</div>
								<div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl mt-2 mb-2">
									<p className="text-[10px] text-blue-800 leading-relaxed font-medium">
										<span className="font-black block mb-1">Как считается объемный вес?</span>
										Если посылка легкая, но объемная, её стоимость рассчитывается по объему. Формула:
										<br />
										<code className="bg-white px-2 py-1 rounded text-blue-700 shadow-sm block mt-1 mb-1 font-bold">
											Объем (м³) = (Длина × Ширина × Высота) в см / 1 000 000
										</code>
										В калькуляторе итоговая цена будет: <b>Объем (м³) × Цена за куб</b>.
										<br />
										Указанный здесь параметр (например, 200 кг/м³) нужен как стандарт.
									</p>
								</div>
							</div>

							<div className="space-y-2 pt-2">
								<label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Цена за куб (с. / м³)</label>
								<div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex items-center focus-within:bg-white focus-within:border-emerald-300 transition-colors">
									<input
										type="number" step="0.01"
										value={companySettings.price_per_cube}
										onChange={e => setCompanySettings({ ...companySettings, price_per_cube: parseFloat(e.target.value) || 0 })}
										className="bg-transparent outline-none w-full font-black text-emerald-600 placeholder-gray-400"
									/>
								</div>
								<p className="text-[10px] text-gray-400 ml-2 leading-tight">Эта цена будет использоваться в клиентском калькуляторе для расчета стоимости доставки по габаритам.</p>
							</div>
						</div>

						<button
							onClick={handleSaveSettings}
							disabled={isSavingSettings}
							className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-colors disabled:opacity-70"
						>
							{isSavingSettings ? <Loader className="animate-spin" size={20} /> : <><Save size={20} /> Сохранить тарифы</>}
						</button>
					</div>
				</div>
			</div>

		</motion.div>
	);
};

export default FinanceStats;
