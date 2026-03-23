import React from 'react';
import DeliveryRequestsTable from '../../components/admin/DeliveryRequestsTable';
import { Truck } from 'lucide-react';

const DeliveryPage = () => {
	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
				<div>
					<h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
						<Truck className="text-indigo-500" />
						Заявки на доставку
					</h1>
					<p className="text-slate-500 mt-1">Управление курьерскими доставками и маршрутами</p>
				</div>
			</div>

			<DeliveryRequestsTable />
		</div>
	);
};

export default DeliveryPage;
