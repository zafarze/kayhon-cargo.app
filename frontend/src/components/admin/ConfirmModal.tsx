// src/components/admin/ConfirmModal.tsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader } from 'lucide-react';

interface ConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	isLoading?: boolean;
	confirmText?: string;
	cancelText?: string;
	isDanger?: boolean; // Если true, кнопка красная
}

const ConfirmModal = ({
	isOpen, onClose, onConfirm, title, message,
	isLoading = false, confirmText = "Подтвердить", cancelText = "Отмена", isDanger = false
}: ConfirmModalProps) => {

	// --- ЛОГИКА ESC ---
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) onClose();
		};
		window.addEventListener('keydown', handleEsc);
		return () => window.removeEventListener('keydown', handleEsc);
	}, [isOpen, onClose]);

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
					<div className="absolute inset-0" onClick={onClose}></div>

					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.9 }}
						className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative z-10 overflow-hidden"
					>
						{/* Декоративный фон */}
						<div className={`absolute top-0 left-0 w-full h-2 ${isDanger ? 'bg-red-500' : 'bg-blue-500'}`}></div>

						<div className="flex flex-col items-center text-center mt-2">
							<div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDanger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
								<AlertTriangle size={28} />
							</div>

							<h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
							<p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
								{message}
							</p>

							<div className="flex gap-3 w-full">
								<button
									onClick={onClose}
									disabled={isLoading}
									className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
								>
									{cancelText}
								</button>
								<button
									onClick={onConfirm}
									disabled={isLoading}
									className={`flex-1 py-3.5 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 ${isDanger
											? 'bg-red-500 hover:bg-red-600 shadow-red-200'
											: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
										}`}
								>
									{isLoading ? <Loader className="animate-spin" size={20} /> : confirmText}
								</button>
							</div>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default ConfirmModal;