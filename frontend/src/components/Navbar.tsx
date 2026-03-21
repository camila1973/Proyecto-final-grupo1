import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale, LANGUAGES, type Language } from '../context/LocaleContext';

export default function Navbar() {
  const { t } = useTranslation();
  const { language, currency, setLanguage } = useLocale();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    setOpen(false);
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

          {/* Language dropdown */}
          <div ref={dropdownRef} className="relative ml-2">
            <button
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-label="select language"
              className="flex items-center gap-1 border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                className={`mr-0.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
              >
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t('nav.language')} · {currency}
            </button>

            {open && (
              <ul
                role="listbox"
                aria-label="language options"
                className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-md z-10 py-1"
              >
                {LANGUAGES.map((lang) => (
                  <li
                    key={lang.value}
                    role="option"
                    aria-selected={language === lang.value}
                    onClick={() => handleSelect(lang.value)}
                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                      language === lang.value ? 'font-semibold text-[#4a6fa5]' : 'text-gray-700'
                    }`}
                  >
                    {lang.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-6 text-sm text-gray-700">
          <a href="#" className="hover:text-gray-900">{t('nav.register')}</a>
          <a href="#" className="hover:text-gray-900">{t('nav.login')}</a>
        </nav>
      </div>
    </header>
  );
}
