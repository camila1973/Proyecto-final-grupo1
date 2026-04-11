import { useState, useEffect, useContext } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { AuthContext } from '../../context/auth-context';
import { API_BASE } from '../../env';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';

const stripePromise = loadStripe(
  (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
);

interface FareBreakdown {
  nights: number;
  roomRateUsd: number;
  subtotalUsd: number;
  taxes: { name: string; amountUsd: number }[];
  fees: { name: string; totalUsd: number }[];
  taxTotalUsd: number;
  feeTotalUsd: number;
  totalUsd: number;
}

interface ReservationResponse {
  id: string;
  fareBreakdown: FareBreakdown;
  grandTotalUsd: number;
  holdExpiresAt: string;
}

function fmt(n: number | string) {
  return `$${Number(n).toFixed(2)}`;
}

// ─── Inner form (needs Stripe context) ───────────────────────────────────────

function CheckoutForm({
  reservation,
  guestEmail,
  checkIn,
  checkOut,
  propertyName,
  roomType,
}: {
  reservation: ReservationResponse;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  propertyName: string;
  roomType: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breakdown = reservation.fareBreakdown;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const card = elements.getElement(CardElement);
    if (!card) {
      setError('Card element not found');
      setLoading(false);
      return;
    }

    // 1. Create PaymentIntent via payment-service
    let clientSecret: string;
    try {
      const res = await fetch(`${API_BASE}/api/payment/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: reservation.id,
          amountUsd: reservation.grandTotalUsd,
          currency: 'usd',
          guestEmail,
        }),
      });
      if (!res.ok) throw new Error('Failed to initiate payment');
      const data = await res.json() as { clientSecret: string };
      clientSecret = data.clientSecret;
    } catch {
      setError('Error iniciando el pago. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    // 2. Confirm card payment with Stripe (tokenizes card)
    const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card,
        billing_details: { email: guestEmail },
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Error procesando el pago');
      setLoading(false);
      return;
    }

    // 3. Payment submitted to Stripe — navigate to confirmation (webhook processes async)
    void navigate({
      to: '/booking/confirmation',
      search: {
        reservationId: reservation.id,
        propertyName,
        roomType,
        checkIn,
        checkOut,
        totalUsd: String(reservation.grandTotalUsd),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Booking summary */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Resumen de reserva
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {propertyName} · {roomType}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {checkIn} → {checkOut} ({breakdown.nights} noche{breakdown.nights !== 1 ? 's' : ''})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Row label={`Habitación × ${breakdown.nights} noches`} value={fmt(breakdown.subtotalUsd)} />
              {breakdown.taxes.map((t) => (
                <Row key={t.name} label={t.name} value={fmt(t.amountUsd)} />
              ))}
              {breakdown.fees.map((f) => (
                <Row key={f.name} label={f.name} value={fmt(f.totalUsd)} />
              ))}
              <Divider sx={{ my: 1 }} />
              <Row label="Total" value={fmt(reservation.grandTotalUsd)} bold />
            </Box>
          </CardContent>
        </Card>

        {/* Card input */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Datos de pago
            </Typography>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 1.5,
                bgcolor: 'background.paper',
              }}
            >
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': { color: '#aab7c4' },
                    },
                  },
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              Tu tarjeta se procesa de forma segura a través de Stripe. No almacenamos datos de tarjeta.
            </Typography>
          </CardContent>
        </Card>

        {error && <Alert severity="error">{error}</Alert>}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={!stripe || loading}
          sx={{ borderRadius: 2, fontWeight: 700, py: 1.5 }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : `Confirmar y pagar ${fmt(reservation.grandTotalUsd)}`}
        </Button>
      </Box>
    </form>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="body2" color={bold ? 'text.primary' : 'text.secondary'} fontWeight={bold ? 700 : 400}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={bold ? 700 : 400}>
        {value}
      </Typography>
    </Box>
  );
}

// ─── Page shell ──────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const search = useSearch({ from: '/checkout' }) as {
    roomId: string;
    propertyId: string;
    partnerId: string;
    checkIn: string;
    checkOut: string;
    guests: string;
    propertyName: string;
    roomType: string;
    totalUsd: string;
  };

  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth?.user) {
      void navigate({ to: '/login' });
      return;
    }

    // Create reservation with 15-min hold
    fetch(`${API_BASE}/api/booking/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: search.propertyId,
        roomId: search.roomId,
        partnerId: search.partnerId,
        guestId: auth.user.id,
        checkIn: search.checkIn,
        checkOut: search.checkOut,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ReservationResponse>;
      })
      .then(setReservation)
      .catch(() => setError('No se pudo crear la reserva. Intenta de nuevo.'));
  }, []);

  if (!auth?.user) return null;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
      <Typography variant="h5" fontWeight={700} mb={4}>
        Finalizar reserva
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!reservation && !error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      )}

      {reservation && (
        <Elements stripe={stripePromise}>
          <CheckoutForm
            reservation={reservation}
            guestEmail={auth.user.email}
            checkIn={search.checkIn}
            checkOut={search.checkOut}
            propertyName={search.propertyName}
            roomType={search.roomType}
          />
        </Elements>
      )}
    </main>
  );
}
