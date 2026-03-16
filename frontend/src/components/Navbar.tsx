import { useTranslation } from 'react-i18next';

export default function Navbar() {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="14" fill="#4a6fa5" />
              <path d="M8 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <circle cx="14" cy="17" r="2.5" fill="white" />
            </svg>
            <span className="font-bold text-lg text-gray-900">TravelHub</span>
          </div>
          <button
            onClick={toggleLanguage}
            aria-label="toggle language"
            className="ml-2 flex items-center gap-1 border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mr-0.5">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('nav.language')}
          </button>
        </div>

        <nav className="flex items-center gap-6 text-sm text-gray-700">
          <a href="#" className="hover:text-gray-900">{t('nav.register')}</a>
          <a href="#" className="hover:text-gray-900">{t('nav.login')}</a>
        </nav>
      </div>
    </header>
  );
}
