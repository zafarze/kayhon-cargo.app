// src/pages/admin/UsersPage.tsx
import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import UsersTable from '../../components/admin/UsersTable';

const UsersPage = () => {
	const [users, setUsers] = useState([]);

	const fetchUsers = async () => {
		try {
			const res = await api.get('/api/auth/users/');
			setUsers(res.data);
		} catch (err) {
			console.error(err);
		}
	};

	useEffect(() => {
		fetchUsers();
	}, []);

	return (
		<div className="max-w-[1600px] mx-auto animate-in fade-in pb-10">
			{/* Передаем функцию обновления в таблицу */}
			<UsersTable users={users} refreshData={fetchUsers} />
		</div>
	);
};

export default UsersPage;