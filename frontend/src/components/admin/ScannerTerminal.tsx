// src/components/admin/ScannerTerminal.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Zap, ScanLine, Camera as CameraIcon, Image as ImageIcon } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import Webcam from 'react-webcam';
import { customConfirm } from '../../utils/customConfirm';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useTranslation } from 'react-i18next';

interface ScannerTerminalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

const ScannerTerminal = ({ isOpen, onClose, onSuccess }: ScannerTerminalProps) => {
	const { t } = useTranslation();
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

	// Функция сжатия изображения перед отправкой
	const compressImage = async (file: File): Promise<File> => {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					const MAX_SIZE = 800;
					let width = img.width;
					let height = img.height;

					if (width > height && width > MAX_SIZE) {
						height *= MAX_SIZE / width;
						width = MAX_SIZE;
					} else if (height > MAX_SIZE) {
						width *= MAX_SIZE / height;
						height = MAX_SIZE;
					}

					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext('2d');
					if (!ctx) return resolve(file);

					ctx.drawImage(img, 0, 0, width, height);
					canvas.toBlob(
						(blob) => {
							if (blob) {
								resolve(new File([blob], file.name, { type: 'image/jpeg' }));
							} else {
								resolve(file);
							}
						},
						'image/jpeg',
						0.7
					);
				};
				img.src = event.target?.result as string;
			};
			reader.readAsDataURL(file);
		});
	};

	const dataURLtoFile = (dataurl: string, filename: string) => {
		const arr = dataurl.split(',');
		const mime = arr[0].match(/:(.*?);/)?.[1];
		const bstr = atob(arr[1]);
		let n = bstr.length;
		const u8arr = new Uint8Array(n);
		while (n--) {
			u8arr[n] = bstr.charCodeAt(n);
		}
		return new File([u8arr], filename, { type: mime });
	};

	// --- 1. АВТОЗАХВАТ С КАМЕРЫ ---
	const handleUserMedia = () => {
		if (!webcamRef.current?.video) return;

		codeReader.current.decodeFromVideoElement(webcamRef.current.video).then((result) => {
			if (result) {
				const rawCode = result.getText().trim();
				if (!rawCode) return;

				// Если считали клиентский QR
				if (rawCode.toUpperCase().startsWith('CLIENT:')) {
					const clientCode = rawCode.replace(/client:/i, '').trim();
					setFormData(prev => ({ ...prev, client_code: clientCode }));
					playBeep();
					toast.success(t('scanner.clientCodeRecognized'));
					return;
				}

				// Сразу останавливаем сканер, чтобы не было дубликатов
				codeReader.current.reset();
				playBeep();

				// Любой другой код считаем трек-кодом
				const normalizedTrackCode = rawCode.replace(/\s+/g, '').trim();
				setFormData(prev => ({ ...prev, track_code: normalizedTrackCode }));

				// Делаем фото для бэкенда
				const imageSrc = webcamRef.current?.getScreenshot();
				if (imageSrc) {
					setAutoScreenshot(imageSrc);
					toast.success(t('scanner.trackCodeCapturedSearching'), { icon: '🔍' });

					const processPhoto = async () => {
						let file = dataURLtoFile(imageSrc, 'auto_capture.jpg');
						file = await compressImage(file);
						const formDataPayload = new FormData();
						formDataPayload.append('photo', file);

						if (!formData.client_code.trim()) {
							api.post('/api/packages/recognize-client/', formDataPayload, {
								headers: { 'Content-Type': 'multipart/form-data' }
							})
								.then(res => {
									if (res.data.client_code) {
										setFormData(prev => ({ ...prev, client_code: res.data.client_code }));
										toast.success(t('scanner.clientFound', { code: res.data.client_code }), { icon: '🤖' });
									}
								})
								.catch(err => console.log('Ошибка распознавания клиента:', err));
						}
					};
					processPhoto();
				} else {
					toast.success(t('scanner.trackCodeCaptured'));
				}

				setIsCameraActive(false);
			}
		}).catch((err: Error) => {
			if (!(err instanceof NotFoundException)) {
				console.error(err);
			}
		});
	};

	useEffect(() => {
		// Очистка при размонтировании
		return () => {
			codeReader.current.reset();
		};
	}, []);

	// --- 2. ЗАГРУЗКА ФОТО ВРУЧНУЮ (ДЛЯ ТЕСТОВ И ПК) ---
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (event) => {
			const imageSrc = event.target?.result as string;

			setAutoScreenshot(imageSrc);
			setIsCameraActive(false);
			setIsScanningLock(true);

			let localBarcodeFound = false;

			// 1. Пытаемся найти штрих-код локально (ZXing)
			try {
				const result = await codeReader.current.decodeFromImageUrl(imageSrc);
				const code = result.getText().trim();
				playBeep();
				setFormData(prev => ({ ...prev, track_code: code }));
				toast.success(t('scanner.barcodeReadSuccess'));
				localBarcodeFound = true;
			} catch {
				console.log('Локальный сканер не справился, ждем ответа от ИИ...');
			}

			const compressedFile = await compressImage(file);
			const formDataPayload = new FormData();
			formDataPayload.append('photo', compressedFile);

			toast.loading(t('scanner.aiAnalyzing'), { id: 'ai-scan' });

			api.post('/api/packages/recognize-client/', formDataPayload, {
				headers: { 'Content-Type': 'multipart/form-data' }
			})
				.then(res => {
					toast.dismiss('ai-scan');

					if (res.data.client_code) {
						setFormData(prev => ({ ...prev, client_code: res.data.client_code }));
						toast.success(t('scanner.clientFound', { code: res.data.client_code }), { icon: '🤖' });
					}

					if (!localBarcodeFound && res.data.track_code) {
						setFormData(prev => ({ ...prev, track_code: res.data.track_code }));
						playBeep();
						toast.success(t('scanner.aiRecognizedTrack', { code: res.data.track_code }), { icon: '🎯' });
					} else if (!localBarcodeFound && !res.data.track_code) {
						toast.error(t('scanner.trackNotFoundManual'), { icon: '⚠️' });
					}
				})
				.catch(err => {
					toast.dismiss('ai-scan');
					console.log('Ошибка ИИ:', err);
					if (!localBarcodeFound) {
						toast.error(t('scanner.photoAnalysisError'));
					}
				});
		};
		reader.readAsDataURL(file);
	};

	// --- 3. ОТПРАВКА НА БЭКЕНД ---
	const handleSubmit = async (e: React.FormEvent, ignoreProhibited = false, forceStatus?: string) => {
		if (e && e.preventDefault) e.preventDefault();
		if (!formData.track_code.trim()) {
			toast.error(t('scanner.trackCodeRequired'));
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
			let file = dataURLtoFile(autoScreenshot, 'auto_capture.jpg');
			file = await compressImage(file);
			payload.append('photo', file);
		}

		try {
			if (scanAction === 'create') {
				const res = await api.post('/api/packages/create/', payload, {
					headers: { 'Content-Type': 'multipart/form-data' }
				});
				if (forceStatus === 'rejected') {
					toast.error(t('scanner.savedAsProhibited'), { icon: '❌' });
				} else if (res.data.ai_recognized) {
					toast.success(t('scanner.aiFoundClient', { code: res.data.client?.client_code || formData.client_code }), { icon: '🤖', duration: 4000 });
				} else {
					toast.success(t('scanner.packageAdded'));
				}
			} else {
				if (!forceStatus) payload.append('new_status', 'arrived_dushanbe');
				const res = await api.post('/api/packages/update/', payload, {
					headers: { 'Content-Type': 'multipart/form-data' }
				});
				if (forceStatus === 'rejected') {
					toast.error(t('scanner.markedAsProhibited'), { icon: '❌' });
				} else if (res.data.ai_recognized) {
					toast.success(t('scanner.aiRecognizedClient', { code: res.data.client?.client_code || formData.client_code }), { icon: '🤖' });
				} else {
					toast.success(t('scanner.acceptedAtDushanbe'));
				}
			}

			setFormData(prev => ({ ...prev, track_code: '', client_code: '', weight: '' }));
			setAutoScreenshot(null);
			setIsScanningLock(false);
			setIsCameraActive(true);
			onSuccess();

		} catch (err: unknown) {
			const error = err as { response?: { data?: { error?: string, message?: string } } };
			if (error.response?.data?.error === 'prohibited_detected') {
				customConfirm(
					t('scanner.confirmProhibited', { message: error.response.data.message || '' }),
					() => { void handleSubmit(e, true); }, // onConfirm
					() => { void handleSubmit(e, false, 'rejected'); } // onCancel
				);
				return;
			}
			toast.error(error.response?.data?.error || t('scanner.errorSaving'));
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
									<h2 className="text-xl font-black text-gray-900">{t('scanner.title')}</h2>
									<p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{t('scanner.autoCapture')}</p>
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
									{t('scanner.chinaReceiving')}
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
									{t('scanner.dushanbeWarehouse')}
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
												<span>{t('scanner.enableScanner')}</span>
											</button>

											{/* НОВАЯ КНОПКА ЗАГРУЗКИ */}
											<button
												type="button"
												onClick={() => fileInputRef.current?.click()}
												className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors border-2 border-dashed border-blue-200"
											>
												<ImageIcon size={24} />
												{t('scanner.uploadPhoto')}
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
														{t('scanner.hoverBarcode')}
													</div>
												</>
											) : (
												<>
													{autoScreenshot && <img src={autoScreenshot} alt="Captured" className="w-full object-cover opacity-80" />}
													<div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
														<div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg">
															<Zap size={16} /> {t('scanner.photoReady')}
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
											<ImageIcon size={20} /> {t('scanner.chooseGallery')}
										</button>
									)}
								</div>

								{/* Поля формы */}
								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">{t('scanner.trackCodeLabel')}</label>
									<input
										type="text"
										required
										value={formData.track_code}
										onChange={e => setFormData({ ...formData, track_code: e.target.value })}
										className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 font-bold text-gray-900 outline-none focus:border-blue-400 focus:bg-white placeholder:text-gray-300"
										placeholder={t('scanner.trackCodePlaceholder')}
									/>
								</div>

								<div>
									<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">
										{t('scanner.clientCodeLabel')} <span className="text-blue-500">{t('scanner.aiWillFind')}</span>
									</label>
									<input
										type="text"
										value={formData.client_code}
										onChange={e => setFormData({ ...formData, client_code: e.target.value })}
										className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 font-bold text-gray-900 outline-none focus:border-blue-400 focus:bg-white"
										placeholder={t('scanner.leaveEmpty')}
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">{t('scanner.weightLabel')}</label>
										<input
											type="number" step="0.01"
											value={formData.weight}
											onChange={e => setFormData({ ...formData, weight: e.target.value })}
											className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 font-bold text-gray-900 outline-none focus:border-blue-400 focus:bg-white"
										/>
									</div>
									<div>
										<label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1 mb-1 block">{t('scanner.shelfLabel')}</label>
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
								{loading ? t('scanner.processing') : t('scanner.savePackage')}
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default ScannerTerminal;
