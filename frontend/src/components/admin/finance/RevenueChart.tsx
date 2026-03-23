// src/components/admin/finance/RevenueChart.tsx
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

interface RevenueChartProps {
	data: Array<{ date: string; revenue: number; weight: number }>;
}

const RevenueChart = ({ data }: RevenueChartProps) => {
	if (!data || data.length === 0) {
		return (
			<div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100/50 border border-gray-100 flex flex-col h-full min-h-[400px] items-center justify-center">
				<Activity size={48} className="text-gray-200 mb-4" />
				<p className="text-gray-400 font-bold">Нет данных для графика</p>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100/50 border border-gray-100 flex flex-col h-full relative overflow-hidden">
			<div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

			<div className="flex justify-between items-start mb-8 relative z-10 p-2">
				<div className="flex items-center gap-4">
					<div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
						<TrendingUp size={24} />
					</div>
					<div>
						<h3 className="text-gray-900 font-bold text-xl">Динамика выручки</h3>
						<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">За последние 30 дней</p>
					</div>
				</div>
			</div>

			<div className="flex-1 w-full min-h-[300px]">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
						<defs>
							<linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
								<stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
							</linearGradient>
						</defs>
						<XAxis 
							dataKey="date" 
							axisLine={false} 
							tickLine={false} 
							tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 700 }}
							dy={10}
						/>
						<YAxis 
							axisLine={false} 
							tickLine={false} 
							tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 700 }}
							tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
						/>
						<CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="3 3" />
						<Tooltip
							contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', cursor: 'default' }}
							itemStyle={{ color: '#111827', fontWeight: 'bold' }}
							labelStyle={{ color: '#6B7280', fontWeight: 'bold', marginBottom: '0.5rem' }}
						/>
						<Area 
							type="monotone" 
							dataKey="revenue" 
							name="Выручка (сомони)" 
							stroke="#2563EB" 
							strokeWidth={4}
							fillOpacity={1} 
							fill="url(#colorRevenue)" 
							activeDot={{ r: 8, strokeWidth: 0, fill: '#2563EB' }}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

export default RevenueChart;
