import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  CircularProgress,
  Snackbar,
  Stack,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import type { ExportFormat } from '../../../utils/queries';

interface Props {
  onDownload: (format: ExportFormat) => Promise<void>;
  errorLabel?: string;
  disabled?: boolean;
}

export default function ExportButtons({ onDownload, errorLabel, disabled }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(format: ExportFormat) {
    setBusy(format);
    setError(null);
    try {
      await onDownload(format);
    } catch (e) {
      setError(errorLabel ?? t('partner.payments.report.download_failed'));
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  const allDisabled = disabled || busy !== null;

  return (
    <>
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          color="primary"
          size="small"
          disabled={allDisabled}
          startIcon={busy === 'pdf' ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdfIcon />}
          onClick={() => handle('pdf')}
        >
          {t('partner.payments.report.export_pdf')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="small"
          disabled={allDisabled}
          startIcon={busy === 'csv' ? <CircularProgress size={14} color="inherit" /> : <DescriptionIcon />}
          onClick={() => handle('csv')}
        >
          {t('partner.payments.report.export_csv')}
        </Button>
      </Stack>

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
    </>
  );
}
