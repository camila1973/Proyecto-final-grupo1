import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usePaymentPolling } from '../../../hooks/usePaymentPolling';
import { fetchReservationById } from '../../../utils/queries';
import HotelDetailCard from './HotelDetailCard';
import PaymentSummaryCard from './PaymentSummaryCard';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function BookingConfirmationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { reservationId } = useSearch({ from: '/booking/confirmation' });

  const { status, failureReason, timedOut } = usePaymentPolling(reservationId);
  const { data: reservation = null } = useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => fetchReservationById(reservationId),
  });

  if (status === 'pending' && !timedOut) {
    return (
      <Box sx={{ flex: 1, bgcolor: '#F5F7FA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 20 }}>
        <CircularProgress size={48} sx={{ mb: 3 }} />
        <Typography variant="h6" fontWeight={500} mb={1}>
          {t('booking.confirmation.processing_title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('booking.confirmation.processing_body')}
        </Typography>
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Box sx={{ flex: 1, bgcolor: '#F5F7FA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 20, px: 3 }}>
        <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={500} mb={1}>
          {t('booking.confirmation.failed_title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          {failureReason ?? t('booking.confirmation.failed_default')}
        </Typography>
        <Button
          variant="contained"
          onClick={() => void navigate({ to: '/' })}
          sx={{ mt: 3, borderRadius: 2, fontWeight: 500 }}
        >
          {t('booking.confirmation.back_home')}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, bgcolor: '#F5F7FA' }}>
      <Box sx={{ maxWidth: '1152px', mx: 'auto', px: 3, py: 4 }}>

        <Alert
          severity="success"
          icon={<CheckCircleOutlineIcon fontSize="inherit" />}
          action={
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
                {t('booking.confirmation.reservation_label')}
              </Typography>
              <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace', mt: 0.25 }}>
                #{reservationId.slice(0, 8).toUpperCase()}
              </Typography>
            </Box>
          }
          sx={{ mb: 2.5, borderRadius: 2, alignItems: 'center' }}
          slotProps={{ action: { sx: { marginRight: 0 } } }}
        >
          <AlertTitle sx={{ fontWeight: 500, mb: 0.25 }}>
            {timedOut ? t('booking.confirmation.timeout_title') : t('booking.confirmation.success_title')}
          </AlertTitle>
          {timedOut
            ? t('booking.confirmation.timeout_body')
            : t('booking.confirmation.success_body')}
        </Alert>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.4fr) minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'flex-start',
        }}>
          <HotelDetailCard reservation={reservation} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <PaymentSummaryCard
              fareBreakdown={reservation?.fareBreakdown}
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => void navigate({ to: '/trips' })}
                sx={{ borderRadius: 1.5, fontWeight: 500, py: 1.5 }}
              >
                {t('booking.confirmation.view_trips')}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                onClick={() => void navigate({ to: '/' })}
                sx={{ borderRadius: 1.5, fontWeight: 500, borderColor: 'primary.main', color: 'primary.main' }}
              >
                {t('booking.confirmation.go_home')}
              </Button>
            </Box>
          </Box>
        </Box>

        <Alert severity="warning" sx={{ mt: 2.5, borderRadius: 2 }}>
          {t('booking.confirmation.cancellation_notice')}
        </Alert>

      </Box>
    </Box>
  );
}
