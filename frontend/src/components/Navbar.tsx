import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useLocale, LANGUAGES, type Language } from '../context/LocaleContext';
import Button from '@mui/material/Button';

export default function Navbar() {
  const { t } = useTranslation();
  const { language, currency, setLanguage } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    setOpen(false);
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="14" fill="#3a608f" />
              <path d="M8 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <circle cx="14" cy="17" r="2.5" fill="white" />
            </svg>
            <span className="font-bold text-lg text-gray-900">TravelHub</span>
          </div>

          <div ref={containerRef} style={{ position: 'relative' }}>
            <Button
              size="small"
              aria-label="select language"
              onClick={() => setOpen((prev) => !prev)}
              endIcon={
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              sx={{
                ml: 1,
                borderRadius: 99,
                border: '1px solid',
                borderColor: 'grey.300',
                color: 'text.secondary',
                textTransform: 'none',
                fontSize: '0.875rem',
                px: 1.5,
                py: 0.5,
              }}
            >
              {t('nav.language')} · {currency}
            </Button>

            {open && (
              <ul
                role="listbox"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  minWidth: 144,
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: 4,
                  padding: 0,
                  listStyle: 'none',
                  zIndex: 1300,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {LANGUAGES.map((lang) => (
                  <li
                    key={lang.value}
                    role="option"
                    aria-selected={language === lang.value}
                    onClick={() => handleSelect(lang.value)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      background: language === lang.value ? '#f5f5f5' : 'transparent',
                    }}
                  >
                    {lang.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-6 text-sm text-gray-700">
          <Link to="/register" className="hover:text-gray-900">{t('nav.register')}</Link>
          <a href="#" className="hover:text-gray-900">{t('nav.login')}</a>
        </nav>
      </div>
    </header>
  );
}
