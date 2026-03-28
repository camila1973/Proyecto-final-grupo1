import { useTranslation } from 'react-i18next';
import { useLocale, LANGUAGES, CURRENCIES, type Language, type Currency } from '../context/LocaleContext';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

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
          <FormControl size="small" variant="outlined" sx={{ minWidth: 110 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>{t('footer.language_label')}</InputLabel>
            <Select
              value={language}
              label={t('footer.language_label')}
              onChange={(e) => setLanguage(e.target.value as Language)}
              sx={{ fontSize: '0.75rem' }}
            >
              {LANGUAGES.map((lang) => (
                <MenuItem key={lang.value} value={lang.value} sx={{ fontSize: '0.75rem' }}>
                  {lang.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" variant="outlined" sx={{ minWidth: 90 }}>
            <InputLabel sx={{ fontSize: '0.75rem' }}>{t('footer.currency_label')}</InputLabel>
            <Select
              value={currency}
              label={t('footer.currency_label')}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              sx={{ fontSize: '0.75rem' }}
            >
              {CURRENCIES.map((c) => (
                <MenuItem key={c} value={c} sx={{ fontSize: '0.75rem' }}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>
    </footer>
  );
}
