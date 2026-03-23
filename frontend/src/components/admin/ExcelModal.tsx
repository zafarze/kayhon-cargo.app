import React, { useState } from 'react';
import { api } from '../../api';
import { X, FileSpreadsheet, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { BeautifulSelect } from '../ui/BeautifulSelect';

interface ExcelModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

const ExcelModal = ({ isOpen, onClose, onSuccess }: ExcelModalProps) => {
	const [file, setFile] = useState<File | null>(null);
	const [status, setStatus] = useState('in_transit');
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<string | null>(null);

	const handleUpload = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) return;

		setLoading(true);
		const formData = new FormData();
		formData.append('file', file);
		formData.append('new_status', status);

		try {
			const res = await api.post('/api/packages/bulk-update/', formData, {
				headers: { 'Content-Type': 'multipart/form-data' }
			});
			setResult(res.data.message);
			toast.success("Файл загружен!");
			onSuccess();
		} catch (err: any) {
			toast.error("Ошибка загрузки");
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
			<div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in duration-200">
				<div className="flex justify-between items-center mb-6">
					<h3 className="text-xl font-bold text-slate-800">Массовая загрузка</h3>
					<button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
				</div>

				{!result ? (
					<form onSubmit={handleUpload} className="space-y-4">
						<div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer relative">
							<input type="file" accept=".xlsx" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
							<FileSpreadsheet className="text-slate-400 mb-2" size={32} />
							<span className="text-sm font-bold text-slate-600">{file ? file.name : "Выберите Excel файл"}</span>
						</div>

						<div className="pb-10">
							<label className="block text-xs font-bold text-slate-400 uppercase mb-2">Установить статус</label>
							<BeautifulSelect
								value={status} 
								onChange={setStatus}
								options={[
									{ value: 'in_transit', label: '🚚 В пути (Отправлено)' },
									{ value: 'arrived_dushanbe', label: '🇹🇯 Прибыл в Душанбе' }
								]}
							/>
						</div>

						<button type="submit" disabled={loading || !file} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50">
							{loading ? 'Загрузка...' : 'Загрузить и Обновить'}
						</button>
					</form>
				) : (
					<div className="text-center py-6">
						<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600"><CheckCircle size={32} /></div>
						<h4 className="text-lg font-bold text-slate-800 mb-2">Готово!</h4>
						<p className="text-slate-500 mb-6">{result}</p>
						<button onClick={onClose} className="bg-slate-100 text-slate-700 font-bold py-2 px-6 rounded-lg hover:bg-slate-200">Закрыть</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default ExcelModal;