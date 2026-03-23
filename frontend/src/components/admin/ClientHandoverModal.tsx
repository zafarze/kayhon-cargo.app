// src/components/admin/ClientHandoverModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Search, UserCheck, Package } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

interface ClientHandoverModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSearch: (codes: string) => void;
}

const ClientHandoverModal = ({ isOpen, onClose, onSearch }: ClientHandoverModalProps) => {
	const [codes, setCodes] = useState<string[]>([]);
	const [inputValue, setInputValue] = useState('');
	const [isCameraActive, setIsCameraActive] = useState(false);

	// Реф для защиты от "спама" сканирования одного и того же кода
	const lastScannedRef = useRef<string>('');

	// --- 1. Очистка и обработка ESC ---
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') handleClose();
		};

		if (isOpen) {
			window.addEventListener('keydown', handleEsc);
		} else {
			setIsCameraActive(false);
			setCodes([]);
			setInputValue('');
		}

		return () => window.removeEventListener('keydown', handleEsc);
	}, [isOpen]);

	const handleClose = () => {
		setIsCameraActive(false);
		setCodes([]);
		setInputValue('');
		onClose();
	};

	// 🔊 Звуковой эффект (Бип!)
	const playBeep = () => {
		const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
		audio.volume = 0.5;
		audio.play().catch(() => { });
	};

	// --- 2. Добавление кода в список ---
	const addCode = (newCode: string) => {
		const cleanCode = newCode.trim();
		if (!cleanCode) return;

		setCodes(prev => {
			if (prev.includes(cleanCode)) return prev; // Защита от дубликатов в списке
			playBeep();
			return [...prev, cleanCode];
		});
	};

	// --- 3. Обработка сканера камеры ---
	const handleCameraScan = (result: any) => {
		if (result && result.length > 0) {
			const scannedCode = result[0].rawValue.trim();

			// Защита: если этот же код в кадре, не пикаем 100 раз подряд
			if (lastScannedRef.current === scannedCode) return;

			lastScannedRef.current = scannedCode;
			playBeep();
			onSearch(scannedCode);
			handleClose();

			// Сбрасываем блокировку кода через 2 секунды (если нужно отсканировать его же повторно)
			setTimeout(() => {
				if (lastScannedRef.current === scannedCode) {
					lastScannedRef.current = '';
				}
			}, 2000);
		}
	};

	// --- 4. Обработка ручного ввода (Enter) ---
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (inputValue.trim()) {
				addCode(inputValue);
				setInputValue('');
			} else if (codes.length > 0) {
				// Если поле пустое, но коды есть — отправляем форму по Enter
				handleSubmit();
			}
		}
	};

	// --- 5. Отправка всех кодов ---
	const handleSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();

		// Захватываем то, что осталось в инпуте, если юзер забыл нажать Enter
		const finalCodes = [...codes];
		if (inputValue.trim() && !finalCodes.includes(inputValue.trim())) {
			finalCodes.push(inputValue.trim());
		}

		if (finalCodes.length === 0) return;

		// Отправляем на бэкенд строкой через запятую (например: "akma16060, YT123456, YT987654")
		onSearch(finalCodes.join(','));
		handleClose();
	};

	// Удаление ошибочно отсканированного кода
	const removeCode = (codeToRemove: string) => {
		setCodes(prev => prev.filter(c => c !== codeToRemove));
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
					<div className="absolute inset-0" onClick={handleClose}></div>

					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative z-10 max-h-[90vh] flex flex-col"
					>
						<button
							onClick={handleClose}
							className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2.5 rounded-full transition-colors z-20"
						>
							<X size={20} />
						</button>

						<div className="flex items-center gap-4 mb-6 shrink-0">
							<div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
								<UserCheck size={28} />
							</div>
							<div>
								<h3 className="text-2xl font-black text-gray-900 leading-none mb-1">Прием клиента</h3>
								<p className="text-xs font-bold text-gray-400 uppercase tracking-wider">QR или ручной поиск</p>
							</div>
						</div>

						<div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
							{/* --- ПЛАШКИ СО СКАНАМИ --- */}
							{codes.length > 0 && (
								<div className="flex flex-wrap gap-2 mb-4">
									<AnimatePresence>
										{codes.map(code => (
											<motion.div
												key={code}
												initial={{ scale: 0.8, opacity: 0 }}
												animate={{ scale: 1, opacity: 1 }}
												exit={{ scale: 0.8, opacity: 0 }}
												className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-xl flex items-center gap-2 text-sm font-bold shadow-sm"
											>
												<Package size={14} className="opacity-50" />
												{code}
												<button
													type="button"
													onClick={() => removeCode(code)}
													className="text-blue-400 hover:text-red-500 transition-colors ml-1"
												>
													<X size={14} />
												</button>
											</motion.div>
										))}
									</AnimatePresence>
								</div>
							)}

							<div className="relative flex items-center mb-4">
								<Search className="absolute left-4 text-gray-400" size={20} />
								<input
									type="text"
									autoFocus={!isCameraActive}
									value={inputValue}
									onChange={e => setInputValue(e.target.value)}
									onKeyDown={handleKeyDown}
									className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-16 py-4 font-bold text-gray-800 outline-none focus:border-blue-400 focus:bg-white transition-colors placeholder:text-gray-400"
									placeholder="Код клиента (ZAFA1234) или телефон..."
								/>
								{/* Подсказка под полем */}

								<button
									type="button"
									onClick={() => setIsCameraActive(!isCameraActive)}
									className={`absolute right-2 p-2.5 rounded-xl transition-all ${isCameraActive ? 'bg-red-500 hover:bg-red-600 text-white shadow-md' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
									title={isCameraActive ? "Выключить камеру" : "Включить камеру"}
								>
									{isCameraActive ? <X size={20} /> : <Camera size={20} />}
								</button>
								{/* Подсказка под полем */}
								<p className="text-[10px] text-gray-400 font-medium mt-1.5 ml-1">
									Введите код клиента вручную или отсканируйте QR-код → Enter
								</p>
							</div>

							{/* --- РЕАЛЬНАЯ КАМЕРА СКАНЕРА --- */}
							<AnimatePresence>
								{isCameraActive && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: 'auto' }}
										exit={{ opacity: 0, height: 0 }}
										className="bg-black rounded-3xl overflow-hidden aspect-video relative shadow-inner mb-4"
									>
										<Scanner
											onScan={handleCameraScan}
											onError={(error) => console.log('Scanner error:', error)}
											components={{ audio: false, torch: true, onOff: true }}
											styles={{ container: { width: '100%', height: '100%' } }}
										/>
										<div className="absolute bottom-4 left-0 right-0 text-center text-white/90 text-xs font-bold drop-shadow-md pointer-events-none bg-black/30 py-1 mx-10 rounded-full backdrop-blur-sm">
											Сканируйте штрихкоды один за другим
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>

						<button
							onClick={handleSubmit}
							disabled={codes.length === 0 && !inputValue.trim()}
							className="w-full mt-4 bg-[#1A5CFF] text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-xl shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex justify-center items-center gap-2"
						>
							<Search size={20} />
							{codes.length > 0 ? `Найти посылки (${codes.length + (inputValue.trim() ? 1 : 0)})` : 'Найти посылки'}
						</button>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default ClientHandoverModal;