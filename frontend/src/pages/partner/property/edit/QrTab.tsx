import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
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

interface QrTabProps {
  propertyId: string;
}

export default function QrTab({ propertyId }: QrTabProps) {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
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

  const isLoading = qrQuery.isLoading || propertyQuery.isLoading;
  const isError = qrQuery.isError;

  const generatedAtLabel = qrQuery.data?.createdAt
    ? new Date(qrQuery.data.createdAt).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <>
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">{t('partner.properties.qr.load_error')}</Alert>
      )}

      {qrQuery.data && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box
              sx={{
                px: 3,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                Vista previa del cartel
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip size="small" variant="outlined" label="Half Letter · 5.5×8.5 in" />
                <Chip size="small" variant="outlined" label="ES + EN" />
              </Stack>
            </Box>

            <Box
              sx={{
                p: { xs: 4, md: 6 },
                display: 'flex',
                justifyContent: 'center',
                backgroundColor: '#F4F6FA',
                backgroundImage:
                  'linear-gradient(45deg, #E6EAF1 25%, transparent 25%, transparent 75%, #E6EAF1 75%, #E6EAF1),' +
                  'linear-gradient(45deg, #E6EAF1 25%, transparent 25%, transparent 75%, #E6EAF1 75%, #E6EAF1)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 8px 8px',
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  width: 320,
                  flexShrink: 0,
                  borderRadius: 2,
                  overflow: 'hidden',
                  textAlign: 'center',
                  bgcolor: '#fff',
                }}
              >
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
            </Box>
          </Card>

          <Stack spacing={2}>
            <Card sx={{ p: 2.5 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1a2332', mb: 2 }}>
                {t('partner.properties.qr.page_title')}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6, mb: 2 }}>
                {t('partner.properties.qr.instructions_body')}
              </Typography>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                onClick={handleDownload}
                disabled={downloading}
              >
                {t('partner.properties.qr.download_btn')}
              </Button>
            </Card>

            <Card sx={{ p: 2.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  {t('partner.properties.qr.status_title')}
                </Typography>
                <Chip
                  size="small"
                  label={t('partner.properties.qr.status_active')}
                  sx={{
                    bgcolor: '#E6F4EA',
                    color: '#137333',
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    height: 22,
                  }}
                />
              </Box>
              {generatedAtLabel && (
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
                  {t('partner.properties.qr.generated_at', { date: generatedAtLabel })}
                </Typography>
              )}
              <Divider sx={{ my: 1.5 }} />
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6, mb: 1.5 }}>
                {t('partner.properties.qr.status_warning')}
              </Typography>
              <Button
                color="error"
                onClick={() => setRegenerateOpen(true)}
                disabled={regenerating}
                startIcon={<RefreshIcon />}
                sx={{ fontWeight: 700, letterSpacing: 0.4, px: 0 }}
              >
                {t('partner.properties.qr.regenerate_link')}
              </Button>
            </Card>
          </Stack>
        </Box>
      )}

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
    </>
  );
}
