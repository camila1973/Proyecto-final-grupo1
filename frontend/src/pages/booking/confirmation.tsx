import { useEffect, useState } from 'react';
import { useSearch, useNavigate, useParams } from '@tanstack/react-router';
import { useLocale } from '../../context/LocaleContext';
import { type ReservationResponse } from '../checkout/types';
import { fetchPaymentStatus, fetchReservationById, type PaymentStatus } from '../../utils/queries';
import { SummaryPanel } from '../checkout/SummaryPanel';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 90_000;

export default function BookingConfirmationPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: '/booking/confirmation/$id' });
  const { currency } = useLocale();
  const search = useSearch({ from: '/booking/confirmation/$id' }) as {
    propertyName: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    totalUsd: string;
  };

  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [failureReason, setFailureReason] = useState<string | undefined>();
  const [timedOut, setTimedOut] = useState(false);
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);

  // Poll payment status
  useEffect(() => {
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      try {
        const data = await fetchPaymentStatus(id);
        setStatus(data.status);
        if (data.failureReason) setFailureReason(data.failureReason);
        if (data.status === 'pending') {
          timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
        }
      } catch {
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    };

    void poll();
    return () => clearTimeout(timer);
  }, [id]);

  // Fetch reservation details
  useEffect(() => {
    fetchReservationById(id)
      .then((data) => setReservation(data))
      .catch(() => null);
  }, [id]);

  // Build intent-like object from search params for SummaryPanel
  const intent = {
    property: { id: '', name: search.propertyName },
    room: { id: '', type: search.roomType, partnerId: '' , totalUsd: Number(search.totalUsd) },
    stay: { checkIn: search.checkIn, checkOut: search.checkOut, guests: 1 },
  };

  if (status === 'pending' && !timedOut) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-6">
        <CircularProgress size={48} sx={{ mb: 3 }} />
        <Typography variant="h6" fontWeight={600} mb={1}>
          Procesando tu pago…
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Esto puede tardar unos segundos. No cierres esta página.
        </Typography>
      </main>
    );
  }

  if (status === 'failed') {
    return (
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-6">
        <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} mb={1}>
          Pago no procesado
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          {failureReason ?? 'Tu pago fue rechazado. Intenta con otra tarjeta.'}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => void navigate({ to: '/' })}
          sx={{ mt: 3, borderRadius: 2, fontWeight: 600 }}
        >
          Volver al inicio
        </Button>
      </main>
    );
  }

  // status === 'captured' or timedOut
  return (
    <main className="flex-1 w-full px-6 py-10" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'flex-start' }}>

        {/* ── Left: confirmation message ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" fontWeight={700} mb={2}>
            {timedOut ? '¡Pago recibido!' : '¡Reserva exitosa!'}
          </Typography>

          <Typography variant="h6" fontWeight={600} mb={2} color="text.secondary">
            Número de reserva #{id.slice(0, 8).toUpperCase()}
          </Typography>

          <Typography variant="body1" color="text.secondary" mb={4} sx={{ lineHeight: 1.7 }}>
            {timedOut
              ? 'Recibimos tu pago correctamente. Te notificaremos por correo electrónico en cuanto tu reserva sea confirmada.'
              : 'Recibirás un correo electrónico de confirmación con todos los detalles de tu reserva. ¡Te deseamos un buen viaje!'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={() => void navigate({ to: '/' })}
              // sx={{ borderRadius: 2, fontWeight: 600, bgcolor: '#2d3a8c', '&:hover': { bgcolor: '#1e2a6e' } }}
            >
              Ir al inicio
            </Button>
          </Box>
        </Box>

        {/* ── Right: SummaryPanel ── */}
        <SummaryPanel intent={intent} reservation={reservation} currency={currency} />
      </Box>
    </main>
  );
}
