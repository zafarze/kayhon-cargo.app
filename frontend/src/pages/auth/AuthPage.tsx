// src/pages/auth/AuthPage.tsx
import React, { useState, useEffect } from 'react';
// Убрали импорт axios, используем наш настроенный api
import { api } from "../../api";
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Loader2, Sparkles, User, Phone, Lock, Eye, EyeOff, Truck, Box, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from "../../store/authStore";

const AuthPage = () => {
	const navigate = useNavigate();

	// ИСПРАВЛЕНИЕ ТУТ: Получаем данные из Zustand по отдельности!
	const login = useAuthStore((state) => state.login);
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const user = useAuthStore((state) => state.user);

	// Переключатель: Регистрация или Вход (По умолчанию ТЕПЕРЬ TRUE - Вход)
	const [isLoginMode, setIsLoginMode] = useState(true);

	// --- АВТОМАТИЧЕСКИЙ РЕДИРЕКТ, ЕСЛИ УЖЕ АВТОРИЗОВАН ---
	useEffect(() => {
		if (isAuthenticated && user) {
			if (user.is_admin) {
				navigate('/admin/dashboard', { replace: true });
			} else if (user.client_code) {
				navigate(`/dashboard/${user.client_code}`, { replace: true });
			}
		}
	}, [isAuthenticated, user, navigate]);

	// Данные формы регистрации
	const [formData, setFormData] = useState({
		first_name: '',
		phone_number: '',
		password: ''
	});

	// Данные для входа (ID + Пароль)
	const [loginData, setLoginData] = useState({
		client_code: '',
		password: ''
	});

	const [clientCode, setClientCode] = useState<string | null>(null);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false); // Для регистрации
	const [showLoginPassword, setShowLoginPassword] = useState(false); // Для входа

	// --- 3D Эффект карточки ---
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const rotateX = useTransform(y, [-100, 100], [5, -5]);
	const rotateY = useTransform(x, [-100, 100], [-5, 5]);

	// --- Анимация фона ---
	const [particles, setParticles] = useState<{ id: number; x: number; y: number; duration: number; delay: number }[]>([]);

	useEffect(() => {
		const newParticles = Array.from({ length: 12 }).map((_, i) => ({
			id: i,
			x: Math.random() * 100,
			y: Math.random() * 100,
			delay: Math.random() * 5,
			duration: 15 + Math.random() * 20,
		}));
		setParticles(newParticles);
	}, []);

	const handleMouseMove = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;
		const xPct = mouseX / width - 0.5;
		const yPct = mouseY / height - 0.5;
		x.set(xPct * 200);
		y.set(yPct * 200);
	};

	const handleMouseLeave = () => {
		x.set(0); y.set(0);
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	// --- ЛОГИКА РЕГИСТРАЦИИ ---
	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		try {
			// Используем api.post - URL берется из настроек api/index.ts
			const response = await api.post('/api/register/', formData);
			setClientCode(response.data.client_code);
		} catch (err: any) {
			if (err.response && err.response.data) {
				const data = err.response.data;
				if (data.phone_number) setError(data.phone_number[0]);
				else setError("Проверьте введенные данные");
			} else {
				setError('Ошибка соединения с сервером');
			}
		} finally {
			setIsLoading(false);
		}
	};

	// --- ЛОГИКА ВХОДА ---
	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!loginData.client_code.trim() || !loginData.password.trim()) {
			setError("Введите Логин/ID и пароль");
			return;
		}

		setIsLoading(true);
		setError('');

		try {
			const response = await api.post('/api/login/', loginData);

			// Получаем токен и данные юзера
			const { access, is_admin, client_code, first_name } = response.data;

			// 1. Сохраняем в глобальный стейт Zustand
			login(access, {
				client_code: client_code || null,
				first_name: first_name || 'Пользователь',
				is_admin: is_admin || false
			});

			// 2. Делаем редирект
			if (is_admin) {
				navigate('/admin/dashboard');
			} else if (client_code) {
				navigate(`/dashboard/${client_code}`);
			} else {
				setError("У этого аккаунта нет доступа");
			}

		} catch (err: any) {
			console.error(err);
			if (err.response && err.response.data && err.response.data.error) {
				setError(err.response.data.error);
			} else {
				setError('Ошибка входа. Проверьте данные.');
			}
		} finally {
			setIsLoading(false);
		}
	};

	// --- АВТО-ЛОГИН ПОСЛЕ РЕГИСТРАЦИИ ---
	const handleAutoLoginAfterRegister = async () => {
		setIsLoading(true);
		try {
			const response = await api.post('/api/login/', {
				client_code: clientCode,
				password: formData.password
			});

			const { access, is_admin, client_code: code, first_name } = response.data;

			login(access, {
				client_code: code || null,
				first_name: first_name || 'Пользователь',
				is_admin: is_admin || false
			});

			navigate(`/dashboard/${code}`);
		} catch (err) {
			// Если что-то пошло не так, просто перекидываем на форму логина
			setLoginData({ client_code: clientCode || '', password: formData.password });
			setClientCode(null);
			setIsLoginMode(true);
			setError("Пожалуйста, войдите используя ваш новый ID.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-700">

			{/* --- ФОН --- */}
			<div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none"
				style={{
					backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(to right, #3b82f6 1px, transparent 1px)',
					backgroundSize: '40px 40px',
					maskImage: 'radial-gradient(circle at center, black 40%, transparent 90%)'
				}}>
			</div>
			<div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-cover bg-center bg-no-repeat"></div>
			<div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
				<div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] bg-blue-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
				<div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-cyan-300/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
				<div className="absolute -bottom-[10%] left-[30%] w-[700px] h-[700px] bg-indigo-300/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000"></div>
			</div>
			{particles.map((p) => (
				<motion.div
					key={p.id}
					className="absolute text-blue-500/20"
					style={{ left: `${p.x}%`, top: `${p.y}%` }}
					animate={{ y: [0, -100, 0], opacity: [0, 1, 0], rotate: [0, 10, -10, 0] }}
					transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
				>
					<Box size={24} strokeWidth={1} />
				</motion.div>
			))}

			{/* --- КАРТОЧКА --- */}
			<motion.div
				className="relative w-full max-w-[420px] mx-4 perspective-1000 z-10"
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				initial={{ scale: 0.9, opacity: 0, y: 30 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				transition={{ type: "spring", duration: 0.8 }}
				style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
			>
				<div className="absolute inset-6 bg-white/40 blur-3xl rounded-full -z-10"></div>

				<div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 relative overflow-hidden group">

					<div className="relative z-10 flex flex-col items-center text-center">

						{/* Логотип */}
						<motion.div
							initial={{ scale: 0, rotate: -45 }}
							animate={{ scale: 1, rotate: 0 }}
							transition={{ type: "spring", delay: 0.2 }}
							className="w-20 h-20 bg-gradient-to-tr from-blue-100 to-white rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white"
						>
							<Truck className="text-blue-600 drop-shadow-sm transform -scale-x-100" size={40} />
						</motion.div>

						<motion.h1
							initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
							className="text-3xl font-black text-slate-800 tracking-tight mb-2"
						>
							Kayhon Cargo
						</motion.h1>

						{/* Заголовок меняется в зависимости от режима */}
						<motion.p
							initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
							className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-8"
						>
							{clientCode ? "Успешно!" : (isLoginMode ? "Безопасный вход" : "Быстрая доставка")}
						</motion.p>

						<AnimatePresence>
							{error && (
								<motion.div
									initial={{ opacity: 0, height: 0, marginBottom: 0 }}
									animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
									exit={{ opacity: 0, height: 0, marginBottom: 0 }}
									className="w-full bg-red-50/80 backdrop-blur-sm text-red-500 text-xs font-bold py-3 rounded-xl border border-red-100 flex items-center justify-center gap-2 overflow-hidden"
								>
									<span className="text-lg">⚠️</span> {error}
								</motion.div>
							)}
						</AnimatePresence>

						{/* ЛОГИКА ОТОБРАЖЕНИЯ ФОРМ */}
						{!clientCode ? (
							<div className="w-full">
								{isLoginMode ? (
									// --- ФОРМА ВХОДА С ПАРОЛЕМ ---
									<form onSubmit={handleLogin} className="w-full space-y-5">
										<div className="text-left group">
											<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1.5">Ваш ID код</label>
											<div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
												<User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
												<input
													type="text"
													className="w-full bg-white/60 border-2 border-slate-100 rounded-2xl px-5 py-4 pl-12 text-slate-800 font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
													placeholder="Zafar2223"
													value={loginData.client_code}
													onChange={(e) => setLoginData({ ...loginData, client_code: e.target.value })}
													required
												/>
											</div>
										</div>

										<div className="text-left group">
											<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1.5">Ваш Пароль</label>
											<div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
												<Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
												<input
													type={showLoginPassword ? "text" : "password"}
													className="w-full bg-white/60 border-2 border-slate-100 rounded-2xl px-5 py-4 pl-12 pr-12 text-slate-800 font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
													placeholder="••••••••"
													value={loginData.password}
													onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
													required
												/>
												<button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors p-1">
													{showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
												</button>
											</div>
										</div>

										<motion.button
											type="submit"
											disabled={isLoading}
											whileHover={{ scale: 1.03 }}
											whileTap={{ scale: 0.98 }}
											className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2"
										>
											{isLoading ? <Loader2 className="animate-spin" size={20} /> : <><span>Войти</span> <LogIn size={18} /></>}
										</motion.button>
									</form>
								) : (
									// --- ФОРМА РЕГИСТРАЦИИ ---
									<form onSubmit={handleRegister} className="w-full space-y-5">
										<div className="text-left group">
											<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1.5">Имя</label>
											<div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
												<User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
												<input
													type="text" name="first_name"
													className="w-full bg-white/60 border-2 border-slate-100 rounded-2xl px-5 py-4 pl-12 text-slate-800 font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
													placeholder="Zafar"
													value={formData.first_name} onChange={handleChange} required
												/>
											</div>
										</div>

										<div className="text-left group">
											<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1.5">Телефон</label>
											<div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
												<Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
												<input
													type="text" name="phone_number"
													className="w-full bg-white/60 border-2 border-slate-100 rounded-2xl px-5 py-4 pl-12 text-slate-800 font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
													placeholder="992900000"
													value={formData.phone_number} onChange={handleChange} required
												/>
											</div>
										</div>

										<div className="text-left group">
											<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1.5">Пароль</label>
											<div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
												<Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
												<input
													type={showPassword ? "text" : "password"} name="password"
													className="w-full bg-white/60 border-2 border-slate-100 rounded-2xl px-5 py-4 pl-12 pr-12 text-slate-800 font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
													placeholder="••••••••"
													value={formData.password} onChange={handleChange} required
												/>
												<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors p-1">
													{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
												</button>
											</div>
										</div>

										<motion.button
											type="submit" disabled={isLoading}
											whileHover={{ scale: 1.03 }}
											whileTap={{ scale: 0.98 }}
											className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2"
										>
											{isLoading ? <Loader2 className="animate-spin" size={20} /> : <><span>Получить ID</span><Sparkles size={18} className="animate-pulse" /></>}
										</motion.button>
									</form>
								)}

								{/* КНОПКА ПЕРЕКЛЮЧЕНИЯ (Внизу) */}
								<div className="mt-6 pt-6 border-t border-slate-100 w-full flex justify-center">
									<button
										onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
										className="text-slate-400 hover:text-blue-600 text-xs font-bold transition-colors uppercase tracking-wider"
									>
										{isLoginMode ? "Нет кода? Регистрация" : "У меня уже есть код"}
									</button>
								</div>
							</div>
						) : (
							// --- БЛОК УСПЕХА (ПОСЛЕ РЕГИСТРАЦИИ) ---
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								className="w-full"
							>
								<div className="bg-green-50/80 backdrop-blur-sm rounded-2xl p-6 border border-green-100 w-full mb-6 relative overflow-hidden">
									<div className="absolute -right-4 -top-4 bg-green-100 w-20 h-20 rounded-full blur-2xl"></div>
									<h3 className="text-green-600 font-bold text-xs uppercase tracking-wider mb-1 relative z-10">Ваш личный код</h3>
									<div className="text-5xl font-black text-slate-800 tracking-widest my-3 relative z-10 font-mono">{clientCode}</div>
									<p className="text-green-600/70 text-[10px] font-bold relative z-10">Сохраните этот код для входа</p>
								</div>

								<motion.button
									onClick={handleAutoLoginAfterRegister}
									disabled={isLoading}
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.98 }}
									className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 flex items-center justify-center gap-2"
								>
									{isLoading ? <Loader2 className="animate-spin" size={20} /> : <><span>Войти в кабинет</span> <Truck size={18} /></>}
								</motion.button>
							</motion.div>
						)}
					</div>
				</div>

				<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase mt-8">
					© 2026 Kayhon Cargo Logistics
				</motion.p>
			</motion.div>
		</div>
	);
};

export default AuthPage;