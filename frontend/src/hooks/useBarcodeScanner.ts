// src/hooks/useBarcodeScanner.ts
import { useEffect, useRef } from 'react';

export const useBarcodeScanner = (onScan: (barcode: string) => void) => {
	const buffer = useRef<string>('');
	const timeout = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Игнорируем, если пользователь печатает в обычный input (например, вводит код клиента руками)
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			// Если нажали Enter и длина буфера похожа на трек-код
			if (e.key === 'Enter' && buffer.current.length > 5) {
				onScan(buffer.current);
				buffer.current = '';
				return;
			}

			// Ловим только печатные символы
			if (e.key.length === 1) {
				buffer.current += e.key;

				// Сканер "печатает" очень быстро. Если пауза больше 50мс - это человек (или случайность).
				if (timeout.current) clearTimeout(timeout.current);
				timeout.current = setTimeout(() => {
					buffer.current = '';
				}, 50);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onScan]);
};