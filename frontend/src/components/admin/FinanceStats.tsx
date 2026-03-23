import { motion } from 'framer-motion';
import { Wallet, DollarSign, Package, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { IStats } from '../../types';
import RevenueChart from './finance/RevenueChart';
import TopClientsLeaderboard from './finance/TopClientsLeaderboard';
import ExpenseManager from './finance/ExpenseManager';

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
							<DollarSign size={24} className="text-red-500" />
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
			<div className="grid grid-cols-1 gap-6">
				<ExpenseManager onExpenseAdded={onRefresh} />
			</div>

		</motion.div>
	);
};

export default FinanceStats;