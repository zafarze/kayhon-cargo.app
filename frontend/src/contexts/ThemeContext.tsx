import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [theme, setTheme] = useState<Theme>(() => {
		const savedTheme = localStorage.getItem('theme') as Theme;
		if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
			return savedTheme;
		}
		return 'system';
	});

	const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

	useEffect(() => {
		const root = window.document.documentElement;
		
		const applyTheme = (currentTheme: Theme) => {
			let activeTheme: 'light' | 'dark' = 'light';
			
			if (currentTheme === 'system') {
				const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
				activeTheme = systemPrefersDark ? 'dark' : 'light';
			} else {
				activeTheme = currentTheme;
			}
			
			root.classList.remove('light', 'dark');
			root.classList.add(activeTheme);
			setActualTheme(activeTheme);
		};

		applyTheme(theme);
		localStorage.setItem('theme', theme);
	}, [theme]);

	useEffect(() => {
		if (theme !== 'system') return;
		
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryListEvent) => {
			const root = window.document.documentElement;
			const newActive = e.matches ? 'dark' : 'light';
			root.classList.remove('light', 'dark');
			root.classList.add(newActive);
			setActualTheme(newActive);
		};
		
		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, [theme]);

	return (
		<ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
};
