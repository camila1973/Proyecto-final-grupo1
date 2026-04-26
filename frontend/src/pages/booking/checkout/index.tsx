import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { consumeCheckoutIntent, peekCheckoutIntent, consumeReservationPromise, useBookingFlow, type CheckoutIntent } from '../../../hooks/useBookingFlow';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { STRIPE_PUBLISHABLE_KEY } from '../../../env';
import { useLocale } from '../../../context/LocaleContext';
import { type ReservationResponse } from './types';
import { CheckoutForm } from './CheckoutForm';
import { SummaryPanel } from './SummaryPanel';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import ArrowBackIosNew from '@mui/icons-material/ArrowBackIosNew';

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

export default function CheckoutPageWithStripe() {
  const { auth, createReservation } = useBookingFlow();
  const navigate = useNavigate();
  const { currency } = useLocale();
  const [intent] = useState<CheckoutIntent | null>(() => peekCheckoutIntent());
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!auth?.user) {
      void navigate({ to: '/login' });
      return;
    }
    if (!intent) {
      void navigate({ to: '/' });
      return;
    }

    const promise = consumeReservationPromise() ?? createReservation(intent);
    promise
      .then((res) => { consumeCheckoutIntent(); setReservation(res); })
      .catch(() => setError('No se pudo crear la reserva. Intenta de nuevo.'));
  }, []);

  if (!auth?.user || !intent) return null;

  return (
    <Box sx={{ flex: 1, bgcolor: '#F5F7FA', minHeight: 'calc(100vh - 64px)' }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 4 }}>
        <Button
          startIcon={<ArrowBackIosNew />}
          onClick={() => history.back()}
          sx={{ color: 'text.secondary', fontWeight: 500, mb: 3 }}
        >
          Volver al hotel
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={500}>Finalizar reserva</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 22, height: 22, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
            }}>1</Box>
            <Typography variant="caption" fontWeight={600}>Detalles</Typography>
            <Box sx={{ width: 24, height: 1, bgcolor: 'divider', mx: 0.5 }} />
            <Box sx={{
              width: 22, height: 22, borderRadius: '50%', bgcolor: 'white', color: 'text.secondary',
              border: '0.5px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
            }}>2</Box>
            <Typography variant="caption" color="text.secondary">Confirmación</Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.4fr) minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'flex-start',
        }}>
          {!reservation && !error ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          ) : reservation ? (
            <>
              <Elements
                stripe={stripePromise}
                options={{
                  mode: 'payment',
                  amount: Math.round(reservation.grandTotalUsd * 100),
                  currency: 'usd',
                }}
              >
                <CheckoutForm
                  reservation={reservation}
                  email={auth.user.email}
                  intent={intent}
                  firstName={auth.user.firstName}
                  lastName={auth.user.lastName}
                  phone={auth.user.phone}
                  setLoading={setFormLoading}
                />
              </Elements>
              <SummaryPanel intent={intent} reservation={reservation} currency={currency} formLoading={formLoading} />
            </>
          ) : null}
        </Box>

      </Box>
    </Box>
  );
}
