import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../../../hooks/useAuth';
import {
  fetchCheckinQr,
  fetchPartnerProperty,
  regenerateCheckinQr,
  downloadCheckinPdf,
  type CheckinQrResponse,
} from '../../../../utils/queries';
import logo from '../../../../assets/logo.png';

export default function PropertyQrPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { propertyId } = useParams({ from: '/mi-hotel/$propertyId/qr' });
  const partnerId = user?.partnerId ?? '';
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const qrQuery = useQuery({
    queryKey: ['checkin-qr', partnerId, propertyId],
    queryFn: () => fetchCheckinQr(partnerId, propertyId, token!),
    enabled: !!token && !!partnerId,
  });

  const propertyQuery = useQuery({
    queryKey: ['partner-property', partnerId, propertyId],
    queryFn: () => fetchPartnerProperty(partnerId, propertyId, token!),
    enabled: !!token && !!partnerId,
  });

  const { mutate: doRegenerate, isPending: regenerating } = useMutation({
    mutationFn: () => regenerateCheckinQr(partnerId, propertyId, token!),
    onSuccess: (data: CheckinQrResponse) => {
      queryClient.setQueryData(['checkin-qr', partnerId, propertyId], data);
      setRegenerateOpen(false);
    },
  });

  const deepLink = `travelhub://checkin?key=${qrQuery.data?.checkInKey ?? ''}`;
  const propertyName = propertyQuery.data?.propertyName ?? '';

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadCheckinPdf(partnerId, propertyId, token!);
    } finally {
      setDownloading(false);
    }
  }

  if (!user?.partnerId) {
    return (
      <Box sx={{ maxWidth: 1152, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        <Alert severity="warning">{t('partner.properties.login_required')}</Alert>
      </Box>
    );
  }

  const isLoading = qrQuery.isLoading || propertyQuery.isLoading;
  const isError = qrQuery.isError;

  return (
    <Box sx={{ maxWidth: 1152, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Button
        variant="text"
        sx={{ mb: 2, fontWeight: 500 }}
        onClick={() => navigate({ to: '/mi-hotel/$propertyId', params: { propertyId } })}
      >
        {t('partner.properties.qr.back')}
      </Button>

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        {t('partner.properties.qr.page_title')}
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">{t('partner.properties.qr.load_error')}</Alert>
      )}

      {qrQuery.data && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="flex-start">

          {/* PDF preview card — mirrors the half-letter PDF layout */}
          <Card
            variant="outlined"
            sx={{
              width: 320,
              flexShrink: 0,
              borderRadius: 3,
              overflow: 'hidden',
              textAlign: 'center',
            }}
          >
            {/* Header band */}
            <Box sx={{ px: 4, pt: 4, pb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box
                component="img"
                src={logo}
                alt="TravelHub"
                sx={{ height: 36, objectFit: 'contain', mb: 3 }}
              />
              <QRCodeSVG value={deepLink} size={200} level="M" />
              <Typography
                color="primary"
                sx={{
                  fontWeight: 700,
                  fontSize: 15,
                  mt: 2,
                  mb: 0.5,
                  minHeight: 22,
                }}
              >
                {propertyName}
              </Typography>
            </Box>

            <Divider sx={{ mx: 3, borderColor: '#E0E0E0' }} />

            {/* Guest instructions — bilingual, matching PDF text */}
            <Box sx={{ px: 4, py: 2.5, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 700, fontSize: 11, color: '#333', mb: 0.75 }}>
                Cómo hacer check-in
              </Typography>
              <Typography sx={{ fontSize: 10, color: '#555', lineHeight: 1.6, mb: 2 }}>
                Abre la app TravelHub, ve a tu reservación{'\n'}
                y presiona Check-in. Escanea este código{'\n'}
                para activar tu llegada.
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 10, color: '#999', mb: 0.5 }}>
                How to check in
              </Typography>
              <Typography sx={{ fontSize: 9.5, color: '#BBB', lineHeight: 1.6, pb: 1 }}>
                Open the TravelHub app, go to your reservation{'\n'}
                and tap Check-in. Scan this code to complete{'\n'}
                your arrival.
              </Typography>
            </Box>
          </Card>

          {/* Controls + manager instructions */}
          <Box sx={{ flex: 1 }}>
            <Stack spacing={1.5} sx={{ maxWidth: 220 }}>
              <Button
                variant="contained"
                startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                onClick={handleDownload}
                disabled={downloading}
              >
                {t('partner.properties.qr.download_btn')}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RefreshIcon />}
                onClick={() => setRegenerateOpen(true)}
                disabled={regenerating}
              >
                {t('partner.properties.qr.regenerate_btn')}
              </Button>
            </Stack>

            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2, mt: 3, maxWidth: 380 }}
            >
              <Typography sx={{ fontWeight: 600, mb: 1, fontSize: 14 }}>
                {t('partner.properties.qr.instructions_title')}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
                {t('partner.properties.qr.instructions_body')}
              </Typography>
            </Paper>
          </Box>
        </Stack>
      )}

      {/* Regenerate confirmation dialog */}
      <Dialog open={regenerateOpen} onClose={() => setRegenerateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('partner.properties.qr.regenerate_dialog_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('partner.properties.qr.regenerate_dialog_body')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateOpen(false)} disabled={regenerating}>
            {t('partner.properties.qr.regenerate_cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => doRegenerate()}
            disabled={regenerating}
            startIcon={regenerating ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('partner.properties.qr.regenerate_confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
