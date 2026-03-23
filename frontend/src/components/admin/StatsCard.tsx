// src/components/admin/StatsCard.tsx
import React from 'react';

interface StatsCardProps {
	title: string;
	value: string | number;
	icon: React.ReactNode;
	color: 'blue' | 'purple' | 'green' | 'red' | string;
	trend?: string;
}

const StatsCard = ({ title, value, icon, color, trend }: StatsCardProps) => {

	// Определяем цвета иконки в зависимости от переданного пропса "color"
	const getColorStyles = () => {
		switch (color) {
			case 'blue': return 'bg-blue-50 text-blue-600';
			case 'purple': return 'bg-purple-50 text-purple-600';
			case 'green': return 'bg-green-50 text-green-600';
			case 'red': return 'bg-red-50 text-red-600';
			default: return 'bg-gray-50 text-gray-600';
		}
	};

	return (
		<div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-100 border border-gray-100 flex flex-col justify-between hover:scale-[1.02] transition-transform">
			<div className="flex justify-between items-start mb-4">
				<div className={`p-4 rounded-2xl ${getColorStyles()}`}>
					{icon}
				</div>
				{trend && (
					<span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full text-right max-w-[100px] leading-tight">
						{trend}
					</span>
				)}
			</div>
			<div>
				<h3 className="text-gray-500 font-bold text-sm mb-1">{title}</h3>
				<p className="text-3xl font-black text-gray-900">{value}</p>
			</div>
		</div>
	);
};

export default StatsCard;