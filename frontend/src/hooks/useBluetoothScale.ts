// src/hooks/useBluetoothScale.ts
import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export const useBluetoothScale = () => {
	const [weight, setWeight] = useState<string>('');
	const [isConnected, setIsConnected] = useState(false);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [device, setDevice] = useState<any | null>(null);
	const weightBuffer = useRef<string>('');

	const connectToScale = useCallback(async () => {
		try {
			// Запрашиваем устройство у браузера (покажет всплывающее окно)
			// Добавляем самые популярные UUID сервисов весов:
			// 0x181D - Стандартный профиль весов (Weight Scale)
			// 0xFFE0 - Популярный китайский UART-модуль (HC-08 / JDY-08) часто в весах
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const bleDevice = await (navigator as any).bluetooth.requestDevice({
				acceptAllDevices: true,
				optionalServices: ['generic_access', 0x181d, 0xffe0]
			});

			const server = await bleDevice.gatt?.connect();
			if (!server) throw new Error("Не удалось подключиться к GATT серверу");

			setIsConnected(true);
			setDevice(bleDevice);
			toast.success(`Подключено к весам: ${bleDevice.name || 'Неизвестные весы'}`);

			// Слушаем отключение
			bleDevice.addEventListener('gattserverdisconnected', () => {
				setIsConnected(false);
				toast.error('Весы отключены!');
			});

			let service;
			let characteristic;

			// 1. Попытка подключиться к китайскому UART (0xFFE0)
			try {
				service = await server.getPrimaryService(0xffe0);
				characteristic = await service.getCharacteristic(0xffe1);

				await characteristic.startNotifications();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
					const value = event.target.value;
					const decoder = new TextDecoder('utf-8');
					const text = decoder.decode(value);

					// Собираем текст в буфер (UART может слать кусками)
					weightBuffer.current += text;

					// Если строка заканчивается на \n или \r
					if (weightBuffer.current.includes('\n') || weightBuffer.current.includes('\r')) {
						// Очищаем от лишних символов (оставляем только цифры и точку)
						const parsedWeight = weightBuffer.current.replace(/[^\d.]/g, '');
						if (parsedWeight && !isNaN(Number(parsedWeight))) {
							setWeight(Number(parsedWeight).toFixed(2));
						}
						weightBuffer.current = '';
					}
				});
				return; // Успешно подключились к UART, выходим
			} catch (err) {
				console.log("Это не UART весы, пробуем стандартный профиль...", err);
			}

			// 2. Попытка подключиться к стандартному профилю (0x181D)
			try {
				service = await server.getPrimaryService(0x181d);
				characteristic = await service.getCharacteristic(0x2a9d); // Weight Measurement

				await characteristic.startNotifications();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
					const value: DataView = event.target.value;

					// Парсинг стандартного Weight Measurement
					// Флаги в 0-м байте
					const flags = value.getUint8(0);
					// Единицы измерения: 0 - СИ (кг/г), 1 - Имперские (фунты)
					const isImperial = (flags & 0x01) !== 0;

					// Вес обычно в байтах 1 и 2
					// Разрешение: 0.005 кг (или 0.01 фунт)
					const weightRaw = value.getUint16(1, true);

					let parsedWeight = weightRaw * 0.005; // В килограммах
					if (isImperial) {
						parsedWeight = weightRaw * 0.01 * 0.453592; // Конвертация из фунтов в кг
					}

					setWeight(parsedWeight.toFixed(2));
				});
			} catch (err) {
				console.error("Не удалось найти подходящий сервис весов:", err);
				toast.error("Формат данных этих весов пока не поддерживается. Нужна настройка UUID.");
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			console.error("Bluetooth Error:", error);
			if (error.name === 'NotFoundError') {
				// Пользователь отменил выбор
				return;
			}
			toast.error("Не удалось подключить весы. Убедитесь что Bluetooth включен.");
		}
	}, []);

	return { weight, setWeight, isConnected, connectToScale, device };
};