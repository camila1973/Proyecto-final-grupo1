import { useEffect, useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { API_BASE } from '../../env';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

type PaymentStatus = 'pending' | 'captured' | 'failed';

interface StatusResponse {
  status: PaymentStatus;
  failureReason?: string;
}

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 90_000;

export default function BookingConfirmationPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/booking/confirmation' }) as {
    reservationId: string;
    propertyName: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    totalUsd: string;
  };

  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [failureReason, setFailureReason] = useState<string | undefined>();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE}/api/payment/payments/${search.reservationId}/status`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as StatusResponse;
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
  }, [search.reservationId]);

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

  if (timedOut || status === 'failed') {
    return (
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-6">
        <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} mb={1}>
          {timedOut ? 'Tiempo de espera agotado' : 'Pago no procesado'}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          {timedOut
            ? 'No recibimos confirmación de Stripe. Verifica tu email o intenta de nuevo.'
            : failureReason ?? 'Tu pago fue rechazado. Intenta con otra tarjeta.'}
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

  // status === 'captured'
  return (
    <main className="flex-1 flex flex-col items-center py-16 px-6">
      <CheckCircleOutlineIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
      <Typography variant="h4" fontWeight={700} mb={1} textAlign="center">
        ¡Reserva confirmada!
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4} textAlign="center">
        Te enviamos un correo de confirmación con los detalles de tu reserva.
      </Typography>

      <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 480, width: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Detalles de tu reserva
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Detail label="Número de reserva" value={search.reservationId} mono />
            <Detail label="Propiedad" value={search.propertyName} />
            <Detail label="Habitación" value={search.roomType} />
            <Detail label="Check-in" value={search.checkIn} />
            <Detail label="Check-out" value={search.checkOut} />
            <Divider />
            <Detail
              label="Total cobrado"
              value={`USD $${Number(search.totalUsd).toFixed(2)}`}
              bold
            />
          </Box>
        </CardContent>
      </Card>

      <Button
        variant="outlined"
        color="primary"
        onClick={() => void navigate({ to: '/' })}
        sx={{ mt: 4, borderRadius: 2, fontWeight: 600 }}
      >
        Volver al inicio
      </Button>
    </main>
  );
}

function Detail({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
      <Typography variant="body2" color="text.secondary" flexShrink={0}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={bold ? 700 : 400}
        textAlign="right"
        sx={mono ? { fontFamily: 'monospace', fontSize: '0.75rem' } : {}}
      >
        {value}
      </Typography>
    </Box>
  );
}
