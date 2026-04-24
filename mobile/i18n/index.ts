import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en';
import es from './locales/es';

const LANG_KEY = '@app_language';
const supportedLangs = ['en', 'es'];

const deviceLang = getLocales()[0]?.languageCode ?? 'es';
const defaultLng = supportedLangs.includes(deviceLang) ? deviceLang : 'es';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: defaultLng,
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
  });

// Apply saved language preference (overrides device default — native only)
if (Platform.OS !== 'web') {
  AsyncStorage.getItem(LANG_KEY).then(saved => {
    if (saved && supportedLangs.includes(saved) && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  });
}

export async function saveLanguage(lang: string) {
  if (Platform.OS !== 'web') {
    await AsyncStorage.setItem(LANG_KEY, lang);
  }
}

export default i18n;
