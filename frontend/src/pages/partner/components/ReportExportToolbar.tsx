import {
  Box,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useTranslation } from 'react-i18next';
import {
  downloadPartnerPayments,
  downloadPropertyPayments,
  type ExportFormat,
} from '../../../utils/queries';
import { formatMonthLabel, monthRange, shiftMonth, yearRange } from '../../../utils/month';
import type { Language } from '../../../context/LocaleContext';
import ExportButtons from './ExportButtons';

export type PeriodMode = 'month' | 'year';

interface Props {
  partnerId: string;
  propertyId: string | null;
  token: string;
  language: Language;
  mode: PeriodMode;
  month: string;
  year: number;
  onModeChange: (next: PeriodMode) => void;
  onMonthChange: (next: string) => void;
  onYearChange: (next: number) => void;
}

export default function ReportExportToolbar({
  partnerId,
  propertyId,
  token,
  language,
  mode,
  month,
  year,
  onModeChange,
  onMonthChange,
  onYearChange,
}: Props) {
  const { t } = useTranslation();

  const range = mode === 'month' ? monthRange(month) : yearRange(year);

  async function onDownload(format: ExportFormat) {
    if (!partnerId) return;
    await (propertyId
      ? downloadPropertyPayments(partnerId, propertyId, format, range.from, range.to, token, language)
      : downloadPartnerPayments(partnerId, format, range.from, range.to, token, language));
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ mb: 1.5 }}
    >
      <ToggleButtonGroup
        size="small"
        color="primary"
        exclusive
        value={mode}
        onChange={(_, v: PeriodMode | null) => v && onModeChange(v)}
      >
        <ToggleButton value="month">{t('partner.payments.report.period_mode.month')}</ToggleButton>
        <ToggleButton value="year">{t('partner.payments.report.period_mode.year')}</ToggleButton>
      </ToggleButtonGroup>

      {mode === 'month' ? (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton size="small" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label="prev-month">
            <ArrowBackIosNewIcon fontSize="inherit" />
          </IconButton>
          <Typography sx={{ fontSize: 13, minWidth: 96, textAlign: 'center' }}>
            {formatMonthLabel(month, language)}
          </Typography>
          <IconButton size="small" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label="next-month">
            <ArrowForwardIosIcon fontSize="inherit" />
          </IconButton>
        </Stack>
      ) : (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton size="small" onClick={() => onYearChange(year - 1)} aria-label="prev-year">
            <ArrowBackIosNewIcon fontSize="inherit" />
          </IconButton>
          <Typography sx={{ fontSize: 13, minWidth: 56, textAlign: 'center' }}>{year}</Typography>
          <IconButton size="small" onClick={() => onYearChange(year + 1)} aria-label="next-year">
            <ArrowForwardIosIcon fontSize="inherit" />
          </IconButton>
        </Stack>
      )}

      <Box sx={{ flexGrow: 1 }} />

      <ExportButtons onDownload={onDownload} />
    </Stack>
  );
}
