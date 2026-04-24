import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { consumeCheckoutIntent, consumeReservationPromise, useBookingFlow, type CheckoutIntent } from '../../hooks/useBookingFlow';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { STRIPE_PUBLISHABLE_KEY } from '../../env';
import { useLocale } from '../../context/LocaleContext';
import { type ReservationResponse } from './types';
import { CheckoutForm } from './CheckoutForm';
import { SummaryPanel } from './SummaryPanel';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

function CheckoutPage() {
  const { auth, createReservation } = useBookingFlow();
  const navigate = useNavigate();
  const { currency } = useLocale();
  const [intent] = useState<CheckoutIntent | null>(() => consumeCheckoutIntent());
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth?.user) {
      void navigate({ to: '/login' });
      return;
    }
    if (!intent) {
      void navigate({ to: '/' });
      return;
    }

    // Consume the promise started in book() — already in flight, fires exactly once
    const promise = consumeReservationPromise() ?? createReservation(intent);
    promise
      .then(setReservation)
      .catch(() => setError('No se pudo crear la reserva. Intenta de nuevo.'));
  }, []);

  if (!auth?.user || !intent) return null;

  return (
    <main className="flex-1 w-full px-6 py-10" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Typography variant="h5" fontWeight={700} mb={4}>
        Finalizar reserva
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'flex-start' }}>
        {!reservation && !error ? (
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : reservation ? (
          <>
            <CheckoutForm reservation={reservation} guestEmail={auth.user.email} intent={intent} />
            <SummaryPanel intent={intent} reservation={reservation} currency={currency} />
          </>
        ) : null}
      </Box>
    </main>
  );
}

export default function CheckoutPageWithStripe() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutPage />
    </Elements>
  );
}
