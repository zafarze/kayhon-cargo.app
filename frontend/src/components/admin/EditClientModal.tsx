import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { IClient } from '../../types';

interface EditClientModalProps {
	client: IClient | null;
	onClose: () => void;
	onSave: (updatedData: Partial<IClient>) => void;
}

const EditClientModal = ({ client, onClose, onSave }: EditClientModalProps) => {
	const [formData, setFormData] = useState({
		first_name: '',
		phone_number: '',
		address: '',
	});

	useEffect(() => {
		if (client) {
			setFormData({
				first_name: client.first_name || '',
				phone_number: client.phone_number || '',
				address: client.address || '',
			});
		}
	}, [client]);

	if (!client) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave(formData);
	};

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
			<div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
				<div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
					<div>
						<h2 className="text-xl font-bold text-gray-800">Редактирование клиента</h2>
						<p className="text-sm text-gray-500 mt-1">ID: {client.client_code}</p>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-600 shadow-sm"
					>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					<div>
						<label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
							Имя
						</label>
						<input
							type="text"
							value={formData.first_name}
							onChange={e => setFormData({ ...formData, first_name: e.target.value })}
							className="w-full border-2 border-gray-100 focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-colors"
						/>
					</div>

					<div>
						<label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
							Телефон
						</label>
						<input
							type="text"
							value={formData.phone_number}
							onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
							className="w-full border-2 border-gray-100 focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-colors"
						/>
					</div>

					<div>
						<label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
							Адрес
						</label>
						<input
							type="text"
							value={formData.address}
							onChange={e => setFormData({ ...formData, address: e.target.value })}
							className="w-full border-2 border-gray-100 focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-colors"
						/>
					</div>

					<div className="pt-4 flex gap-3">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors"
						>
							Отмена
						</button>
						<button
							type="submit"
							className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30"
						>
							Сохранить
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EditClientModal;