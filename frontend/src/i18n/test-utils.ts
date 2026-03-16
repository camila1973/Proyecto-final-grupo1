import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

export function setupTestI18n(defaultLng: 'en' | 'es' = 'es') {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        es: { translation: es },
      },
      lng: defaultLng,
      fallbackLng: 'es',
      interpolation: { escapeValue: false },
    });
  } else {
    i18n.changeLanguage(defaultLng);
  }
  return i18n;
}
