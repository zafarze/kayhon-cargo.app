// Custom Service Worker для обработки Push-уведомлений
// Этот файл будет зарегистрирован vite-plugin-pwa

self.addEventListener('push', (event) => {
	if (!event.data) return;

	const data = event.data.json();

	const options = {
		body: data.body || 'Новое уведомление',
		icon: data.icon || '/icon-192.png',
		badge: data.badge || '/icon-192.png',
		vibrate: [100, 50, 100],
		data: {
			url: data.url || '/',
		},
		actions: [
			{ action: 'open', title: 'Открыть' },
			{ action: 'close', title: 'Закрыть' },
		],
	};

	event.waitUntil(
		self.registration.showNotification(data.title || 'Kayhon Cargo', options)
	);
});

// При клике на уведомление — открываем приложение
self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const url = event.notification.data?.url || '/';

	if (event.action === 'close') return;

	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			// Если приложение уже открыто — фокусируемся
			for (const client of clientList) {
				if (client.url.includes(self.location.origin) && 'focus' in client) {
					client.navigate(url);
					return client.focus();
				}
			}
			// Иначе открываем новое окно
			return clients.openWindow(url);
		})
	);
});
