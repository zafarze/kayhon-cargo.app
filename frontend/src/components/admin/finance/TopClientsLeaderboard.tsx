// src/components/admin/finance/TopClientsLeaderboard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Trophy, TrendingUp } from 'lucide-react';

interface TopClientsLeaderboardProps {
	clients: Array<{ client_code: string; first_name: string; revenue: number }>;
}

const TopClientsLeaderboard = ({ clients }: TopClientsLeaderboardProps) => {
	if (!clients || clients.length === 0) {
		return null;
	}

	return (
		<div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100/50 border border-gray-100 flex flex-col relative overflow-hidden h-full">
			<div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-bl-[100px] -mr-10 -mt-10" />

			<div className="flex items-center gap-4 mb-8">
				<div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center shadow-inner">
					<Crown size={24} />
				</div>
				<div>
					<h3 className="text-gray-900 font-bold text-xl relative z-10">Топ Клиентов</h3>
					<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">По выручке</p>
				</div>
			</div>

			<div className="space-y-4 flex-1">
				{clients.map((client, index) => (
					<motion.div
						key={client.client_code}
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: index * 0.1 }}
						className={`flex items-center justify-between p-4 rounded-2xl border ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200' : 'bg-gray-50 border-gray-100'} hover:scale-[1.02] transition-transform`}
					>
						<div className="flex items-center gap-4">
							<div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200' : index === 1 ? 'bg-gray-300 text-white shadow-md' : index === 2 ? 'bg-orange-300 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}>
								{index === 0 ? <Trophy size={16} /> : `#${index + 1}`}
							</div>
							<div>
								<p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
									{client.first_name || 'Без Имени'}
								</p>
								<p className="text-xs font-mono font-medium text-gray-500">
									{client.client_code}
								</p>
							</div>
						</div>
						<div className="text-right">
							<p className="font-black text-gray-900">
								{client.revenue.toLocaleString()} с.
							</p>
							<div className="flex items-center gap-1 justify-end text-[10px] text-green-500 font-bold">
								<TrendingUp size={12} />
								VIP
							</div>
						</div>
					</motion.div>
				))}
			</div>
		</div>
	);
};

export default TopClientsLeaderboard;
