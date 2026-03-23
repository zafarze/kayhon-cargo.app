import { useEffect, useRef } from 'react';

export function useAutoRefresh(callback: () => void, interval = 10000) {
	const savedCallback = useRef(callback);

	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	useEffect(() => {
		const tick = () => {
			savedCallback.current();
		};

		// Initial fetch handled by component itself usually
		const id = setInterval(tick, interval);
		return () => clearInterval(id);
	}, [interval]);
}
