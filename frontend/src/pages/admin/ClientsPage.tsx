import { useEffect, useState } from 'react';
import { api } from '../../api';
import { IClient } from '../../types';
import ClientsTable from '../../components/admin/ClientsTable';
import EditClientModal from '../../components/admin/EditClientModal';
import AddClientModal from '../../components/admin/AddClientModal';
import toast from 'react-hot-toast';
import { customConfirm } from '../../utils/customConfirm';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const ClientsPage = () => {
	const [clients, setClients] = useState<IClient[]>([]);
	const [totalClients, setTotalClients] = useState<number>(0);
	const [editingClient, setEditingClient] = useState<IClient | null>(null);
	const [isAdding, setIsAdding] = useState(false);

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const limit = 20;

	const fetchClients = () => {
		api.get(`/api/clients/?page=${page}&limit=${limit}`).then(res => {
			if (res.data.results) {
				setClients(res.data.results);
				setTotalClients(res.data.count);
				setTotalPages(Math.ceil(res.data.count / limit));
			} else {
				setClients(res.data);
				setTotalClients(res.data.length);
				setTotalPages(1);
			}
		});
	};

	useEffect(() => {
		fetchClients();
	}, [page]);

	useAutoRefresh(() => {
		if (!isAdding && !editingClient) {
			fetchClients();
		}
	}, 20000);

	const handleEditSave = async (updatedData: Partial<IClient>) => {
		if (!editingClient) return;
		try {
			await api.patch(`/api/clients/${editingClient.id}/`, updatedData);
			toast.success('Данные клиента обновлены');
			setEditingClient(null);
			fetchClients();
		} catch (error) {
			console.error(error);
			toast.error('Ошибка при обновлении клиента');
		}
	};

	const handleAddClient = async (data: { first_name: string; password: string }) => {
		try {
			// В API регистрации отправляем имя и пароль, клиентский код сгенерируется
			const res = await api.post('/api/register/', data);
			toast.success(`Клиент добавлен! Код: ${res.data.client_code}`);
			setIsAdding(false);
			fetchClients();
		} catch (error: unknown) {
			console.error(error);
			const err = error as { response?: { data?: { error?: string } } };
			toast.error(err.response?.data?.error || 'Ошибка при добавлении клиента');
		}
	};

	const handleDeleteClient = async (client: IClient) => {
		customConfirm(`Удалить клиента ${client.first_name || client.client_code}?`, async () => {
			try {
				await api.delete(`/api/clients/${client.id}/`);
				toast.success('Клиент удален');
				fetchClients();
			} catch (error) {
				console.error(error);
				toast.error('Ошибка при удалении клиента');
			}
		});
	};

	return (
		<div className="max-w-[1600px] mx-auto animate-in fade-in space-y-6">
			<ClientsTable
				clients={clients}
				totalClients={totalClients}
				onEdit={(client) => setEditingClient(client)}
				onDelete={handleDeleteClient}
				onAddClick={() => setIsAdding(true)}
			/>

			{totalPages > 1 && (
				<div className="flex justify-center items-center gap-2 mt-6">
					<button
						onClick={() => setPage(p => Math.max(1, p - 1))}
						disabled={page === 1}
						className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl disabled:opacity-50 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-900 dark:text-white transition-colors"
					>
						Назад
					</button>
					<span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
						Страница <span className="text-gray-900 dark:text-white font-bold">{page}</span> из {totalPages}
					</span>
					<button
						onClick={() => setPage(p => Math.min(totalPages, p + 1))}
						disabled={page === totalPages}
						className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl disabled:opacity-50 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-900 dark:text-white transition-colors"
					>
						Вперед
					</button>
				</div>
			)}

			<EditClientModal
				client={editingClient}
				onClose={() => setEditingClient(null)}
				onSave={handleEditSave}
			/>

			{isAdding && (
				<AddClientModal
					onClose={() => setIsAdding(false)}
					onSave={handleAddClient}
				/>
			)}
		</div>
	);
};

export default ClientsPage;
