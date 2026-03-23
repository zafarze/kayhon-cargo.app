import toast from 'react-hot-toast';
import { TriangleAlert } from 'lucide-react';

/**
 * Обертка для показа красивого окна подтверждения с помощью react-hot-toast.
 * @param message Сообщение для пользователя
 * @param onConfirm Функция, которая выполнится при нажатии "Да"
 * @param onCancel Опциональная функция, которая выполнится при отмене
 */
export const customConfirm = (message: string, onConfirm: () => void, onCancel?: () => void) => {
	toast.custom(
		(t) => (
			<div
				className={`${
					t.visible ? 'animate-enter' : 'animate-leave'
				} max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex flex-col p-6 border border-gray-100`}
			>
				<div className="flex items-start gap-4 mb-6">
					<div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
						<TriangleAlert size={24} />
					</div>
					<div className="flex-1 pt-1">
						<p className="text-lg font-black text-gray-900 leading-tight">Подтверждение</p>
						<p className="mt-1 text-sm font-medium text-gray-500">{message}</p>
					</div>
				</div>
				<div className="flex gap-3 mt-auto">
					<button
						onClick={() => {
							toast.dismiss(t.id);
							if (onCancel) onCancel();
						}}
						className="flex-1 w-full rounded-xl px-4 py-3 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
					>
						Отмена
					</button>
					<button
						onClick={() => {
							toast.dismiss(t.id);
							onConfirm();
						}}
						className="flex-1 w-full rounded-xl border border-transparent bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
					>
						Подтвердить
					</button>
				</div>
			</div>
		),
		{ duration: Infinity, position: 'top-center' }
	);
};

export const customAlert = (message: string) => {
	toast.error(message, {
		duration: 5000,
		iconTheme: {
			primary: '#ef4444',
			secondary: '#fff',
		},
		style: {
			borderRadius: '1rem',
			background: '#333',
			color: '#fff',
			fontWeight: 'bold',
			padding: '16px 24px',
		}
	});
};
