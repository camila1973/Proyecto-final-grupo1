import { IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTranslation } from 'react-i18next';
import { currentMonth, formatMonthLabel, shiftMonth } from '../../../utils/month';
import type { Language } from '../../../context/LocaleContext';

const NAV_BTN = {
  bgcolor: '#1B4F8C',
  color: '#fff',
  '&:hover': { bgcolor: '#163d6e' },
  '&.Mui-disabled': { bgcolor: '#cbd5e0', color: '#fff' },
} as const;

interface MonthSwitcherProps {
  month: string;
  onChange: (next: string) => void;
  language: Language;
}

export default function MonthSwitcher({ month, onChange, language }: MonthSwitcherProps) {
  const { t } = useTranslation();
  // Disable forward navigation past the current month — there's no booking
  // data in the future, so the dashboard would just render zeroes.
  const atCurrentMonth = month >= currentMonth();
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography sx={{ fontSize: 12, color: '#4a5568', minWidth: 110, textAlign: 'right' }}>
        {formatMonthLabel(month, language)}
      </Typography>
      <IconButton
        size="small"
        aria-label={t('partner.dashboard.prev_month')}
        onClick={() => onChange(shiftMonth(month, -1))}
        sx={NAV_BTN}
      >
        <ArrowBackIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label={t('partner.dashboard.next_month')}
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={atCurrentMonth}
        sx={NAV_BTN}
      >
        <ArrowForwardIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
