/* eslint-disable react-refresh/only-export-components -- context files intentionally export hooks and constants alongside the provider */
import { createContext, useContext, useState, type ReactNode } from 'react';
import i18n from '../i18n';

export type Language = 'es' | 'en';
export type Currency = 'COP' | 'USD' | 'EUR';

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

export const CURRENCIES: Currency[] = ['COP', 'USD', 'EUR'];

interface LocaleContextValue {
  language: Language;
  currency: Currency;
  setLanguage: (lang: Language) => void;
  setCurrency: (currency: Currency) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLanguage = 'es',
  initialCurrency = 'COP',
}: {
  children: ReactNode;
  initialLanguage?: Language;
  initialCurrency?: Currency;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [currency, setCurrency] = useState<Currency>(initialCurrency);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <LocaleContext.Provider value={{ language, currency, setLanguage, setCurrency }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within <LocaleProvider>');
  return ctx;
}
