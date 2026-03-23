// src/hooks/useBluetoothScale.ts
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useBluetoothScale = () => {
	const [weight, setWeight] = useState<string>('');
	const [isConnected, setIsConnected] = useState(false);
	const [device, setDevice] = useState<BluetoothDevice | null>(null);

	const connectToScale = useCallback(async () => {
		try {
			// Запрашиваем устройство у браузера (покажет всплывающее окно)
			const bleDevice = await navigator.bluetooth.requestDevice({
				acceptAllDevices: true, // Для тестов ищем все весы. В проде лучше указать services: ['battery_service', и тд]
				optionalServices: ['generic_access'] // Замените на UUID сервиса ваших весов, когда купите их
			});

			const server = await bleDevice.gatt?.connect();
			setIsConnected(true);
			setDevice(bleDevice);
			toast.success(`Подключено к весам: ${bleDevice.name || 'Неизвестные весы'}`);

			// Слушаем отключение
			bleDevice.addEventListener('gattserverdisconnected', () => {
				setIsConnected(false);
				toast.error('Весы отключены!');
			});

			// ВАЖНО: Ниже пример того, как читать данные (нужно будет подставить правильные UUID ваших весов)
			/*
			const service = await server.getPrimaryService('ваш-uuid-сервиса');
			const characteristic = await service.getCharacteristic('ваш-uuid-характеристики');
			await characteristic.startNotifications();
			characteristic.addEventListener('characteristicvaluechanged', (event) => {
				const value = event.target.value;
				// Декодируем вес (зависит от модели весов)
				// const currentWeight = decodeWeight(value);
				// setWeight(currentWeight);
			});
			*/

		} catch (error) {
			console.error("Bluetooth Error:", error);
			toast.error("Не удалось подключить весы");
		}
	}, []);

	return { weight, setWeight, isConnected, connectToScale };
};