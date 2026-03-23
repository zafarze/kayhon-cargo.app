// src/pages/DashboardRouter.tsx
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import ClientDashboardPage from './client/ClientDashboardPage';
import TelegramDashboard from './telegram/TelegramDashboard';
import { useTelegram } from '../hooks/useTelegram';

const DashboardRouter = () => {
	const { clientCode } = useParams<{ clientCode: string }>();

	// 1. Получаем статус из хука (реальный телеграм)
	const { isTelegram: nativeTelegram } = useTelegram();

	// 2. Проверяем URL (для теста в браузере через ?tg=true)
	const isMockTelegram = new URLSearchParams(window.location.search).get('tg') === 'true';

	// 3. Объявляем итоговую переменную isTelegram
	const isTelegram = nativeTelegram || isMockTelegram;

	if (!clientCode) {
		return <Navigate to="/" replace />;
	}

	// Если открыто в Телеграме
	if (isTelegram) {
		return <TelegramDashboard />;
	}

	// Обычный сайт для ПК/браузера
	return <ClientDashboardPage />;
};

export default DashboardRouter;