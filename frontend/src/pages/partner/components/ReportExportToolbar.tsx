import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GridOnIcon from '@mui/icons-material/GridOn';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import {
  downloadPaymentsReportPdf,
  downloadPaymentsReportXlsx,
} from '../../../utils/queries';
import { currentMonth, formatMonthLabel, shiftMonth } from '../../../utils/month';
import type { Language } from '../../../context/LocaleContext';

type PeriodMode = 'month' | 'year';

interface Props {
  partnerId: string;
  propertyId: string | null;
  token: string;
  language: Language;
}

export default function ReportExportToolbar({
  partnerId,
  propertyId,
  token,
  language,
}: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<PeriodMode>('month');
  const [month, setMonth] = useState<string>(currentMonth());
  const [year, setYear] = useState<number>(new Date().getUTCFullYear());
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = mode === 'month' ? monthRange(month) : yearRange(year);

  async function onDownload(format: 'pdf' | 'xlsx') {
    if (!partnerId) return;
    setBusy(format);
    setError(null);
    try {
      const fn = format === 'pdf' ? downloadPaymentsReportPdf : downloadPaymentsReportXlsx;
      await fn(partnerId, range.from, range.to, token, propertyId, language);
    } catch (e) {
      setError(t('partner.payments.report.download_failed'));
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="flex-end"
      sx={{ mb: 1.5 }}
    >
      <ToggleButtonGroup
        size="small"
        exclusive
        value={mode}
        onChange={(_, v: PeriodMode | null) => v && setMode(v)}
        sx={{
          '& .MuiToggleButton-root': { textTransform: 'none', fontSize: 12, px: 1.5 },
          '& .Mui-selected': { bgcolor: '#1B4F8C !important', color: '#fff !important' },
        }}
      >
        <ToggleButton value="month">{t('partner.payments.report.period_mode.month')}</ToggleButton>
        <ToggleButton value="year">{t('partner.payments.report.period_mode.year')}</ToggleButton>
      </ToggleButtonGroup>

      {mode === 'month' ? (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton size="small" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="prev-month">
            <ArrowBackIosNewIcon sx={{ fontSize: 12 }} />
          </IconButton>
          <Typography sx={{ fontSize: 12, minWidth: 96, textAlign: 'center' }}>
            {formatMonthLabel(month, language)}
          </Typography>
          <IconButton size="small" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="next-month">
            <ArrowForwardIosIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Stack>
      ) : (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton size="small" onClick={() => setYear((y) => y - 1)} aria-label="prev-year">
            <ArrowBackIosNewIcon sx={{ fontSize: 12 }} />
          </IconButton>
          <Typography sx={{ fontSize: 12, minWidth: 56, textAlign: 'center' }}>{year}</Typography>
          <IconButton size="small" onClick={() => setYear((y) => y + 1)} aria-label="next-year">
            <ArrowForwardIosIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Stack>
      )}

      <Button
        size="small"
        variant="contained"
        disabled={busy !== null}
        startIcon={busy === 'pdf' ? <CircularProgress size={14} /> : <PictureAsPdfIcon />}
        onClick={() => onDownload('pdf')}
        sx={{ bgcolor: '#1B4F8C', textTransform: 'none', fontSize: 12, '&:hover': { bgcolor: '#163d6e' } }}
      >
        {t('partner.payments.report.export_pdf')}
      </Button>
      <Button
        size="small"
        variant="contained"
        disabled={busy !== null}
        startIcon={busy === 'xlsx' ? <CircularProgress size={14} /> : <GridOnIcon />}
        onClick={() => onDownload('xlsx')}
        sx={{ bgcolor: '#1B4F8C', textTransform: 'none', fontSize: 12, '&:hover': { bgcolor: '#163d6e' } }}
      >
        {t('partner.payments.report.export_xlsx')}
      </Button>

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

function monthRange(month: string): { from: string; to: string } {
  // month = "YYYY-MM"; from = first day; to = first day of next month (exclusive)
  const [y, m] = month.split('-').map(Number);
  const from = `${month}-01`;
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const to = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  return { from, to };
}

function yearRange(year: number): { from: string; to: string } {
  return {
    from: `${year}-01-01`,
    to: `${year + 1}-01-01`,
  };
}
