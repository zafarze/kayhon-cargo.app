import { useEffect, useState } from 'react';
import { api } from '../../api';
import FinanceStats from '../../components/admin/FinanceStats';

const FinancePage = () => {
	const [stats, setStats] = useState(null);

	const fetchStats = () => {
		api.get('/api/admin-dashboard/').then(res => setStats(res.data.stats));
	};

	useEffect(() => {
		fetchStats();
	}, []);

	return (
		<div className="max-w-[1600px] mx-auto animate-in fade-in pt-4 pb-8">
			<h1 className="text-2xl font-black mb-6">Финансовые показатели</h1>
			<FinanceStats stats={stats} onRefresh={fetchStats} />
		</div>
	);
};

export default FinancePage;