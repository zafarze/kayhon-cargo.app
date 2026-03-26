// src/components/admin/RecentPackagesTable.tsx
import React from 'react';
import { Package } from 'lucide-react';

interface RecentPackagesTableProps {
	packages: any[];
}

const RecentPackagesTable = ({ packages }: RecentPackagesTableProps) => {

	// Функция для красивых цветов статусов
	const getStatusStyle = (status: string) => {
		switch (status) {
			case 'expected': return 'bg-gray-100 text-gray-600 border-gray-200';
			case 'china_warehouse': return 'bg-orange-50 text-orange-600 border-orange-200';
			case 'in_transit': return 'bg-blue-50 text-blue-600 border-blue-200';
			case 'arrived_dushanbe': return 'bg-purple-50 text-purple-600 border-purple-200';
			case 'ready_for_pickup': return 'bg-green-50 text-green-700 border-green-200';
			case 'delivered': return 'bg-slate-100 text-slate-500 border-slate-200';
			default: return 'bg-gray-50 text-gray-600 border-gray-100';
		}
	};

	return (
		<div className="bg-white rounded-[2rem] shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
			<div className="p-6 border-b border-gray-50 flex items-center gap-3">
				<div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
					<Package size={22} />
				</div>
				<h3 className="text-xl font-bold text-gray-900">Недавние посылки</h3>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-left border-collapse">
					<thead>
						<tr className="text-gray-400 text-[10px] uppercase tracking-wider font-black bg-gray-50/50">
							<th className="p-5 pl-8">Трек-код</th>
							<th className="p-5">Клиент</th>
							<th className="p-5">Описание</th>
							<th className="p-5">Статус</th>
							<th className="p-5">Полка</th>
							<th className="p-5">Вес / Цена</th>
							<th className="p-5 pr-8 text-right">Дата</th>
						</tr>
					</thead>
					<tbody className="text-sm text-gray-600">
						{packages && packages.length > 0 ? (
							packages.map((pkg, index) => (
								<tr key={pkg.id || index} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors last:border-0">
									<td className="p-5 pl-8 font-black text-gray-900">{pkg.track_code}</td>

									<td className="p-5">
										<span className="font-bold text-gray-700">
											ID: {pkg.client?.client_code || '—'}
										</span>
									</td>

									<td className="p-5 text-gray-500 font-medium truncate max-w-[150px]">
										{pkg.description || '—'}
									</td>

									<td className="p-5">
										<span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusStyle(pkg.status)}`}>
											{pkg.status_display}
										</span>
									</td>

									<td className="p-5 font-bold text-gray-500">
										{pkg.shelf_location || '—'}
									</td>

									<td className="p-5">
										<div className="font-black text-gray-900">{pkg.weight} кг</div>
										<div className="text-xs text-gray-400 font-bold mt-0.5">{pkg.total_price} с.</div>
									</td>

									<td className="p-5 pr-8 text-right text-xs font-bold text-gray-400">
										{new Date(pkg.created_at).toLocaleDateString('ru-RU')}
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={7} className="p-10 text-center">
									<Package size={40} className="text-gray-200 mx-auto mb-3" />
									<p className="text-gray-400 font-bold">Посылок пока нет</p>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default RecentPackagesTable;