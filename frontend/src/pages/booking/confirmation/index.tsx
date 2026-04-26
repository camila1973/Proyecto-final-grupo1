import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { usePaymentPolling } from '../../../hooks/usePaymentPolling';
import { useReservation } from '../../../hooks/useReservation';
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
  const { id } = useParams({ from: '/booking/confirmation/$id' });
  const search = useSearch({ from: '/booking/confirmation/$id' }) as {
    propertyName: string;
    roomType: string;
    totalUsd: string;
  };

  const { status, failureReason, timedOut } = usePaymentPolling(id);
  const reservation = useReservation(id);

  if (status === 'pending' && !timedOut) {
    return (
      <Box sx={{ flex: 1, bgcolor: '#F5F7FA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 20 }}>
        <CircularProgress size={48} sx={{ mb: 3 }} />
        <Typography variant="h6" fontWeight={500} mb={1}>
          Procesando tu pago…
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Esto puede tardar unos segundos. No cierres esta página.
        </Typography>
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Box sx={{ flex: 1, bgcolor: '#F5F7FA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 20, px: 3 }}>
        <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={500} mb={1}>
          Pago no procesado
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          {failureReason ?? 'Tu pago fue rechazado. Intenta con otra tarjeta.'}
        </Typography>
        <Button
          variant="contained"
          onClick={() => void navigate({ to: '/' })}
          sx={{ mt: 3, borderRadius: 2, fontWeight: 500 }}
        >
          Volver al inicio
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, bgcolor: '#F5F7FA' }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 4 }}>

        <Alert
          severity="success"
          icon={<CheckCircleOutlineIcon fontSize="inherit" />}
          action={
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
                Reserva
              </Typography>
              <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace', mt: 0.25 }}>
                #{id.slice(0, 8).toUpperCase()}
              </Typography>
            </Box>
          }
          sx={{ mb: 2.5, borderRadius: 2, alignItems: 'center' }}
          slotProps={{ action: { sx: { marginRight: 0 } } }}
        >
          <AlertTitle sx={{ fontWeight: 500, mb: 0.25 }}>
            {timedOut ? '¡Pago recibido!' : 'Reserva exitosa'}
          </AlertTitle>
          {timedOut
            ? 'Recibimos tu pago. Te notificaremos por correo cuando tu reserva sea confirmada.'
            : 'Recibirás un correo de confirmación con todos los detalles. ¡Buen viaje!'}
        </Alert>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.4fr) minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'flex-start',
        }}>
          <HotelDetailCard
            propertyName={search.propertyName}
            roomType={search.roomType}
            reservation={reservation}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <PaymentSummaryCard
              totalUsd={Number(search.totalUsd)}
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
                Ver mis reservas
              </Button>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                onClick={() => void navigate({ to: '/' })}
                sx={{ borderRadius: 1.5, fontWeight: 500, borderColor: 'primary.main', color: 'primary.main' }}
              >
                Ir al inicio
              </Button>
            </Box>
          </Box>
        </Box>

        <Alert severity="warning" sx={{ mt: 2.5, borderRadius: 2 }}>
          <strong>Cancelación gratuita</strong> hasta 24 horas antes del check-in. Después aplica el cargo de una noche.
        </Alert>

      </Box>
    </Box>
  );
}
