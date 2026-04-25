import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LanguageIcon from '@mui/icons-material/Language';
import { useLocale, LANGUAGES, CURRENCIES, type Language, type Currency } from '../context/LocaleContext';



export default function LocaleSelector() {
  const { t } = useTranslation();
  const { language, currency, setLanguage, setCurrency } = useLocale();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <button
        aria-label="select language and currency"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        className="flex items-center gap-2 rounded-full border-gray-300 px-3 py-1 hover:bg-gray-50 transition-colors"
      >
        <LanguageIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
        <span className="flex flex-col items-start text-left">
          <span className="text-xs text-gray-500 leading-tight">{t('nav.language')}</span>
          <span className="flex items-center gap-0.5 text-xs font-semibold text-gray-800 leading-tight">
            {currency}
            <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
          </span>
        </span>
      </button>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 3, minWidth: 280, borderRadius: 2, mt: 1 } } }}
      >
        <Typography fontWeight={700} fontSize="0.875rem" mb={1.5}>
          {t('nav.locale_language')}
        </Typography>
        <ToggleButtonGroup
          value={language}
          exclusive
          onChange={(_, val: Language | null) => { if (val) setLanguage(val); }}
          fullWidth
          size="small"
        >
          {LANGUAGES.map((lang) => (
            <ToggleButton key={lang.value} value={lang.value} sx={{ textTransform: 'none', fontWeight: 500 }}>
              {lang.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Divider sx={{ my: 2 }} />

        <Typography fontWeight={700} fontSize="0.875rem" mb={1.5}>
          {t('nav.locale_currency')}
        </Typography>
        <ToggleButtonGroup
          value={currency}
          exclusive
          onChange={(_, val: Currency | null) => { if (val) setCurrency(val); }}
          fullWidth
          size="small"
        >
          {CURRENCIES.map((c) => (
            <ToggleButton key={c} value={c} sx={{ textTransform: 'none', fontWeight: 500 }}>
              {c}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Divider sx={{ my: 2 }} />

        <Button fullWidth variant="outlined" onClick={() => setAnchorEl(null)}>
          {t('hero.guests_done')}
        </Button>
      </Popover>
    </>
  );
}
