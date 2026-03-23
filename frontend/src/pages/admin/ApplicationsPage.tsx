import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { IApplication } from '../../types';
import RequestsTable from '../../components/admin/RequestsTable';

const ApplicationsPage = () => {
	const [requests, setRequests] = useState<IApplication[]>([]);

	const fetchData = async () => {
		try {
			const res = await api.get('/api/applications/');
			setRequests(res.data);
		} catch (e) {
			console.error(e);
		}
	};

	useEffect(() => { fetchData(); }, []);

	return (
		<div className="max-w-[1600px] mx-auto animate-in fade-in">
			<RequestsTable requests={requests} refreshData={fetchData} />
		</div>
	);
};

export default ApplicationsPage;