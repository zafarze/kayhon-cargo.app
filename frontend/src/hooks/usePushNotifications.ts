/**
 * Хук для интеграции Web Push уведомлений.
 * Запрашивает разрешение, подписывает браузер и отправляет подписку на бэкенд.
 */
import { useEffect, useCallback } from 'react';
import { api } from '../api';

// Конвертирует base64url строку в Uint8Array (нужно для PushManager)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export function usePushNotifications() {
	const subscribeToPush = useCallback(async () => {
		try {
			// 1. Проверяем поддержку
			if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
				console.log('Push notifications not supported');
				return;
			}

			// 2. Запрашиваем разрешение
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				console.log('Push permission denied');
				return;
			}

			// 3. Получаем VAPID ключ с бэкенда
			const { data } = await api.get('/api/push/vapid-key/');
			const vapidPublicKey = data.public_key;

			if (!vapidPublicKey) {
				console.warn('VAPID public key not configured on server');
				return;
			}

			// 4. Получаем регистрацию Service Worker
			const registration = await navigator.serviceWorker.ready;

			// 5. Подписываемся на Push
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
			});

			// 6. Отправляем подписку на бэкенд
			const subJson = subscription.toJSON();
			await api.post('/api/push/subscribe/', {
				endpoint: subJson.endpoint,
				keys: {
					p256dh: subJson.keys?.p256dh,
					auth: subJson.keys?.auth,
				},
			});

			console.log('✅ Push subscription saved');
		} catch (error) {
			console.error('Push subscription error:', error);
		}
	}, []);

	// Автоматически подписываемся при монтировании (если есть токен)
	useEffect(() => {
		const token = localStorage.getItem('token');
		if (token) {
			subscribeToPush();
		}
	}, [subscribeToPush]);

	return { subscribeToPush };
}
