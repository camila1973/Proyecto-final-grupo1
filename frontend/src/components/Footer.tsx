import { useTranslation } from 'react-i18next';
import { useLocale, LANGUAGES, CURRENCIES, type Language, type Currency } from '../context/LocaleContext';

export default function Footer() {
  const { t } = useTranslation();
  const { language, currency, setLanguage, setCurrency } = useLocale();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
        <span>{t('footer.copyright')}</span>

        <div className="flex gap-4">
          <a href="#" className="hover:text-gray-700">{t('footer.privacy')}</a>
          <a href="#" className="hover:text-gray-700">{t('footer.terms')}</a>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="language-select" className="sr-only">{t('footer.language_label')}</label>
          <select
            id="language-select"
            aria-label={t('footer.language_label')}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white hover:border-gray-400 cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {t('footer.language_label')}: {lang.label}
              </option>
            ))}
          </select>

          <label htmlFor="currency-select" className="sr-only">{t('footer.currency_label')}</label>
          <select
            id="currency-select"
            aria-label={t('footer.currency_label')}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white hover:border-gray-400 cursor-pointer"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {t('footer.currency_label')}: {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </footer>
  );
}
