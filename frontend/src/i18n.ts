import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ru from './locales/ru.json';
import en from './locales/en.json';
import tj from './locales/tj.json';

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		fallbackLng: 'ru',
		supportedLngs: ['ru', 'en', 'tj'],
		debug: false,
		interpolation: {
			escapeValue: false,
		},
		resources: {
			ru: { translation: ru },
			en: { translation: en },
			tj: { translation: tj }
		}
	});

export default i18n;
