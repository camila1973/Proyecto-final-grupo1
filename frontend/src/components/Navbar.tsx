import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale, LANGUAGES, type Language } from '../context/LocaleContext';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

export default function Navbar() {
  const { t } = useTranslation();
  const { language, currency, setLanguage } = useLocale();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    setAnchorEl(null);
  };

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

          <Button
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
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

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{ paper: { sx: { mt: 0.5, minWidth: 144 } } }}
          >
            {LANGUAGES.map((lang) => (
              <MenuItem
                key={lang.value}
                selected={language === lang.value}
                onClick={() => handleSelect(lang.value)}
                sx={{ fontSize: '0.875rem' }}
              >
                {lang.label}
              </MenuItem>
            ))}
          </Menu>
        </div>

        <nav className="flex items-center gap-6 text-sm text-gray-700">
          <a href="#" className="hover:text-gray-900">{t('nav.register')}</a>
          <a href="#" className="hover:text-gray-900">{t('nav.login')}</a>
        </nav>
      </div>
    </header>
  );
}
