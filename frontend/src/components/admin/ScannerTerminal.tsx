// src/components/admin/ScannerTerminal.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Zap, ScanLine, Camera as CameraIcon, Image as ImageIcon } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import Webcam from 'react-webcam';
import { customConfirm } from '../../utils/customConfirm';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface ScannerTerminalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

const ScannerTerminal = ({ isOpen, onClose, onSuccess }: ScannerTerminalProps) => {
	const [scanAction, setScanAction] = useState<'create' | 'arrive'>('create');

	// --- Состояния автосканера ---
	const webcamRef = useRef<Webcam>(null);
	const fileInputRef = useRef<HTMLInputElement>(null); // <--- Ссылка на скрытый инпут для файла
	const [isCameraActive, setIsCameraActive] = useState(false);
	const codeReader = useRef(new BrowserMultiFormatReader());
	const [isScanningLock, setIsScanningLock] = useState(false);

	const [formData, setFormData] = useState({
		client_code: '', track_code: '', weight: '', shelf_location: ''
	});

	const [autoScreenshot, setAutoScreenshot] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// --- Закрытие на ESC ---
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
		if (isOpen) window.addEventListener('keydown', handleEsc);
		return () => window.removeEventListener('keydown', handleEsc);
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) setIsCameraActive(false);
	}, [isOpen]);

	const handleClose = () => {
		setIsCameraActive(false);
		setFormData({ client_code: '', track_code: '', weight: '', shelf_location: '' });
		setAutoScreenshot(null);
		setIsScanningLock(false);
		onClose();
	};

	const playBeep = () => {
		const context = new (window.AudioContext || (window as any).webkitAudioContext)();
		const oscillator = context.createOscillator();
		oscillator.type = 'sine';
		oscillator.frequency.value = 800;
		oscillator.connect(context.destination);
		oscillator.start();
		setTimeout(() => oscillator.stop(), 150);
	};

	// --- 1. АВТОЗАХВАТ С КАМЕРЫ ---
	const captureAndScan = useCallback(async () => {
		if (!isCameraActive || isScanningLock || !webcamRef.current) return;

		const imageSrc = webcamRef.current.getScreenshot();
		if (!imageSrc) return;

		try {
			const result = await codeReader.current.decodeFromImageUrl(imageSrc);
			const code = result.getText().trim();

			setIsScanningLock(true);
			playBeep();

			if (code.startsWith('CLIENT:') || code.startsWith('client:')) {
				setFormData(prev => ({ ...prev, client_code: code.replace(/client:/i, '') }));
				toast.success('Код клиента распознан!');
			} else {
				setFormData(prev => ({ ...prev, track_code: code }));
				setAutoScreenshot(imageSrc);
				toast.success('Трек-код и фото захвачены!');

				// Запускаем распознавание клиента с фото в фоне
				const file = dataURLtoFile(imageSrc, 'auto_capture.jpg');
				const formDataPayload = new FormData();
				formDataPayload.append('photo', file);

				api.post('/api/packages/recognize-client/', formDataPayload)
					.then(res => {
						if (res.data.client_code) {
							setFormData(prev => ({ ...prev, client_code: res.data.client_code }));
							toast.success(`Клиент найден: ${res.data.client_code}`, { icon: '🤖' });
						}
					})
					.catch(err => console.log('Ошибка распознавания клиента:', err));
			}

			setIsCameraActive(false);

		} catch (err: any) {
			if (err instanceof NotFoundException) return;
		}
	}, [isCameraActive, isScanningLock]);

	useEffect(() => {
		let interval: ReturnType<typeof setInterval>;
		if (isCameraActive && !isScanningLock) {
			interval = setInterval(captureAndScan, 300);
		}
		return () => clearInterval(interval);
	}, [isCameraActive, isScanningLock, captureAndScan]);

	// --- 2. ЗАГРУЗКА ФОТО ВРУЧНУЮ (ДЛЯ ТЕСТОВ И ПК) ---
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (event) => {
			const imageSrc = event.target?.result as string;

			// Ставим картинку в превью и выключаем камеру
			setAutoScreenshot(imageSrc);
			setIsCameraActive(false);
			setIsScanningLock(true);

			// Пытаемся найти штрих-код на загруженной картинке
			try {
				const result = await codeReader.current.decodeFromImageUrl(imageSrc);
				const code = result.getText().trim();
				playBeep();
				setFormData(prev => ({ ...prev, track_code: code }));
				toast.success('Штрих-код успешно считан с фото!');
			} catch (err) {
				toast.error('Штрих-код не найден. Введите трек-код вручную.', { icon: '⚠️' });
			}

			// Пытаемся найти клиента на загруженной картинке
			const file = dataURLtoFile(imageSrc, 'uploaded.jpg');
			const formDataPayload = new FormData();
			formDataPayload.append('photo', file);
			api.post('/api/packages/recognize-client/', formDataPayload)
				.then(res => {
					if (res.data.client_code) {
						setFormData(prev => ({ ...prev, client_code: res.data.client_code }));
						toast.success(`Клиент найден: ${res.data.client_code}`, { icon: '🤖' });
					}
				})
				.catch(err => console.log('Ошибка распознавания клиента:', err));
		};
		reader.readAsDataURL(file);
	};

	const dataURLtoFile = (dataurl: string, filename: string) => {
		let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1],
			bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
		while (n--) {
			u8arr[n] = bstr.charCodeAt(n);
		}
		return new File([u8arr], filename, { type: mime });
	}

	// --- 3. ОТПРАВКА НА БЭКЕНД ---
	const handleSubmit = async (e: React.FormEvent, ignoreProhibited = false, forceStatus?: string) => {
		if (e && e.preventDefault) e.preventDefault();
		if (!formData.track_code.trim()) {
			toast.error('Трек-код обязателен!');
			return;
		}

		setLoading(true);

		const payload = new FormData();
		payload.append('track_code', formData.track_code.trim());
		if (formData.client_code.trim()) payload.append('client_code', formData.client_code.trim());
		if (formData.weight.trim()) payload.append('weight', formData.weight.trim());
		if (formData.shelf_location.trim()) payload.append('shelf_location', formData.shelf_location.trim());

		if (ignoreProhibited) payload.append('ignore_prohibited', 'true');
		if (forceStatus) payload.append('force_status', forceStatus);

		if (autoScreenshot) {
			const file = dataURLtoFile(autoScreenshot, 'auto_capture.jpg');
			payload.append('photo', file);
		}

		try {
			if (scanAction === 'create') {
				const res = await api.post('/api/packages/create/', payload);
				if (forceStatus === 'rejected') {
					toast.error('Товар сохранен со статусом "Запрещено"', { icon: '❌' });
				} else if (res.data.ai_recognized) {
					toast.success(`ИИ нашел клиента: ${res.data.client.client_code}!`, { icon: '🤖', duration: 4000 });
				} else {
					toast.success('Посылка добавлена!');
				}
			} else {
				if (!forceStatus) payload.append('new_status', 'arrived_dushanbe');
				const res = await api.post('/api/packages/update/', payload);
				if (forceStatus === 'rejected') {
					toast.error('Товар отмечен как запрещенный', { icon: '❌' });
				} else if (res.data.ai_recognized) {
					toast.success(`ИИ распознал клиента: ${res.data.client.client_code}!`, { icon: '🤖' });
				} else {
					toast.success('Принято на складе в Душанбе!');
				}
			}

			setFormData(prev => ({ ...prev, track_code: '', client_code: '', weight: '' }));
			setAutoScreenshot(null);
			setIsScanningLock(false);
			setIsCameraActive(true);
			onSuccess();

		} catch (err: any) {
			if (err.response?.data?.error === 'prohibited_detected') {
				customConfirm(
					err.response.data.message + '\n\nПодтвердить: добавить в список (разрешить)\nОтмена: отклонить и пометить товар как запрещенный.',
					() => handleSubmit(e, true), // onConfirm
					() => handleSubmit(e, false, 'rejected') // onCancel
				);
				return;
			}
			toast.error(err.response?.data?.error || 'Ошибка при сохранении');
		} finally {
			setLoading(false);
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
					<div className="absolute inset-0" onClick={handleClose}></div>

					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col max-h-[95vh]"
					>
						{/* HEADER */}
						<div className="p-5 md:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
									<ScanLine size={24} />
								</div>
								<div>
									<h2 className="text-xl font-black text-gray-900">Терминал</h2>
									<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Авто-захват</p>
								</div>
							</div>
							<button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
								<X size={24} />
							</button>
						</div>

						{/* ТАБЫ */}
						<div className="px-6 pt-4 shrink-0">
							<div className="flex bg-gray-50 p-1 rounded-xl">
								<button
									type="button" // <--- Обязательно добавляем это
									onClick={() => {
										setScanAction('create');
										setIsCameraActive(false); // <--- Выключаем камеру при переключении
										setAutoScreenshot(null);  // <--- Сбрасываем старое фото
									}}
									className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${scanAction === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
								>
									🇨🇳 Приемка в Китае
								</button>
								<button
									type="button" // <--- И здесь тоже
									onClick={() => {
										setScanAction('arrive');
										setIsCameraActive(false); // <--- Выключаем камеру при переключении
										setAutoScreenshot(null);  // <--- Сбрасываем старое фото
									}}
									className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${scanAction === 'arrive' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
								>
									🇹🇯 Склад Душанбе
								</button>
							</div>
						</div>

						{/* FORM BODY */}
						<div className="p-6 overflow-y-auto custom-scrollbar flex-1">
							<form id="scanner-form" onSubmit={handleSubmit} className="space-y-5">

								{/* Скрытый инпут для загрузки фото */}
								<input
									type="file"
									accept="image/*"
									className="hidden"
									ref={fileInputRef}
									onChange={handleFileUpload}
								/>

								{/* БЛОК КАМЕРЫ / ФОТО */}
								<div className="w-full">
									{!isCameraActive && !autoScreenshot ? (
										<div className="flex flex-col gap-3">
											<button
												type="button"
												onClick={() => { setIsCameraActive(true); setIsScanningLock(false); }}
												className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-lg transition-transform active:scale-[0.98]"
											>
												<CameraIcon size={32} />
												<span>Включить сканер (Камера)</span>
											</button>

											{/* НОВАЯ КНОПКА ЗАГРУЗКИ */}
											<button
												type="button"
												onClick={() => fileInputRef.current?.click()}
												className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors border-2 border-dashed border-blue-200"
											>
												<ImageIcon size={24} />
												Загрузить фото с компьютера
											</button>
										</div>
									) : (
										<div className="relative rounded-2xl overflow-hidden bg-black shadow-inner">
											{isCameraActive ? (
												<>
													<Webcam
														audio={false}
														ref={webcamRef}
														screenshotFormat="image/jpeg"
														videoConstraints={{
															facingMode: "environment",
															width: { ideal: 1920 },
															height: { ideal: 1080 }
														}}
														style={{ width: '100%', display: 'block' }}
													/>
													<div className="absolute inset-0 border-4 border-green-500/50 m-8 rounded-xl pointer-events-none"></div>
													<div className="absolute bottom-3 left-0 right-0 text-center text-white text-xs font-bold drop-shadow-md bg-black/40 py-1">
														Наведите на штрих-код...
													</div>
												</>
											) : (
												<>
													{autoScreenshot && <img src={autoScreenshot} alt="Captured" className="w-full object-cover opacity-80" />}
													<div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
														<div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg">
															<Zap size={16} /> Фото готово!
														</div>
													</div>
													<button
														type="button"
														onClick={() => { setAutoScreenshot(null); setFormData(p => ({ ...p, track_code: '' })); setIsScanningLock(false); setIsCameraActive(true); }}
														className="absolute top-2 right-2 bg-red-500/80 text-white p-2 rounded-lg hover:bg-red-600"
													>
														<X size={16} />
													</button>
												</>
											)}
										</div>
									)}

									{/* Если камера активна, даем возможность передумать и загрузить фото */}
									{isCameraActive && (
										<button
											type="button"
											onClick={() => fileInputRef.current?.click()}
											className="mt-3 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
										>
											<ImageIcon size={20} /> Выбрать из галереи
										</button>
									)}
								</div>

								{/* Поля формы */}
								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Трек-код *</label>
									<input
										type="text"
										required
										value={formData.track_code}
										onChange={e => setFormData({ ...formData, track_code: e.target.value })}
										className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 font-bold text-gray-900 outline-none focus:border-blue-400 focus:bg-white placeholder:text-gray-300"
										placeholder="Считается автоматически..."
									/>
								</div>

								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">
										Код клиента <span className="text-blue-500">(ИИ найдет сам по фото)</span>
									</label>
									<input
										type="text"
										value={formData.client_code}
										onChange={e => setFormData({ ...formData, client_code: e.target.value })}
										className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 font-bold text-gray-900 outline-none focus:border-blue-400 focus:bg-white"
										placeholder="Оставьте пустым"
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Вес (кг)</label>
										<input
											type="number" step="0.01"
											value={formData.weight}
											onChange={e => setFormData({ ...formData, weight: e.target.value })}
											className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 font-bold text-gray-900 outline-none focus:border-blue-400 focus:bg-white"
										/>
									</div>
									<div>
										<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Полка</label>
										<input
											type="text"
											value={formData.shelf_location}
											onChange={e => setFormData({ ...formData, shelf_location: e.target.value })}
											className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 font-bold text-gray-900 outline-none focus:border-blue-400 focus:bg-white"
										/>
									</div>
								</div>
							</form>
						</div>

						{/* FOOTER */}
						<div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-[2.5rem] shrink-0">
							<button
								form="scanner-form"
								type="submit"
								disabled={loading || !formData.track_code}
								className={`w-full text-white font-black py-4 rounded-xl shadow-lg flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${scanAction === 'create' ? 'bg-[#1A5CFF] hover:bg-blue-700 shadow-blue-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'}`}
							>
								<Save size={20} />
								{loading ? 'Обработка...' : 'Сохранить посылку'}
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default ScannerTerminal;