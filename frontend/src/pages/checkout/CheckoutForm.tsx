import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { type CheckoutIntent } from '../../hooks/useBookingFlow';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { API_BASE } from '../../env';
import { useLocale } from '../../context/LocaleContext';
import { formatPrice } from '../../utils/currency';
import { type ReservationResponse } from './types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import QrCode2Icon from '@mui/icons-material/QrCode2';

type PaymentMethod = 'credit_card' | 'google_pay' | 'paypal';

export function CheckoutForm({
  reservation,
  intent,
  email: initialEmail,
  firstName: initialFirstName,
  lastName: initialLastName,
  phone: initialPhone,
}: {
  reservation: ReservationResponse;
  intent: CheckoutIntent;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { currency } = useLocale();

  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState(initialFirstName ?? '');
  const [lastName, setLastName] = useState(initialLastName ?? '');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || paymentMethod !== 'credit_card') return;
    setLoading(true);
    setError(null);

    const card = elements.getElement(CardElement);
    if (!card) {
      setError('Card element not found');
      setLoading(false);
      return;
    }

    try {
      const patchRes = await fetch(
        `${API_BASE}/api/booking/reservations/${reservation.id}/guest-info`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email: email, phone }),
        },
      );
      if (!patchRes.ok) throw new Error('guest_info_failed');
    } catch {
      setError('Error guardando los datos del huésped. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    let clientSecret: string;
    try {
      const res = await fetch(`${API_BASE}/api/payment/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: reservation.id,
          amountUsd: reservation.grandTotalUsd,
          currency: 'usd',
          email,
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

    const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card,
        billing_details: {
          name: `${firstName} ${lastName}`.trim() || email,
          email: email,
          phone,
        },
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Error procesando el pago');
      setLoading(false);
      return;
    }

    void navigate({
      to: '/booking/confirmation',
      search: {
        reservationId: reservation.id,
        propertyName: intent.property.name,
        roomType: intent.room.type,
        checkIn: intent.stay.checkIn,
        checkOut: intent.stay.checkOut,
        totalUsd: String(reservation.grandTotalUsd),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* ── Detalles de la orden ── */}
        <Box>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Detalles del huésped
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                  Nombre
                </Typography>
                <TextField size="small" fullWidth value={firstName} onChange={(e) => setFirstName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
              </Box>
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                  Apellido
                </Typography>
                <TextField size="small" fullWidth value={lastName} onChange={(e) => setLastName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                Correo electrónico
              </Typography>
              <TextField size="small" fullWidth type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
            </Box>

            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                Teléfono
              </Typography>
              <TextField size="small" fullWidth type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
            </Box>

          </Box>
        </Box>

        {/* ── Forma de pago ── */}
        <Box>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Forma de pago
          </Typography>
          <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
            {/* Credit card */}
            <Box sx={{ border: '1px solid', borderColor: paymentMethod === 'credit_card' ? 'primary.main' : 'divider', borderRadius: 2, px: 2, py: 1, mb: 1 }}>
              <FormControlLabel
                value="credit_card"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>Tarjeta de crédito</span>
                    <CreditCardIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </Box>
                }
                sx={{ m: 0, width: '100%' }}
              />
              {paymentMethod === 'credit_card' && (
                <Box sx={{ mt: 1.5, mb: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5, bgcolor: 'background.paper' }}>
                  <CardElement options={{ style: { base: { fontSize: '15px', color: '#424770', '::placeholder': { color: '#aab7c4' } } } }} />
                </Box>
              )}
            </Box>

            {/* Google Pay */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2, py: 1, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.5 }}>
              <FormControlLabel value="google_pay" control={<Radio size="small" disabled />} label="Google Pay" sx={{ m: 0 }} disabled />
              <Chip label="Próximamente" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
            </Box>

            {/* PayPal */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.5 }}>
              <FormControlLabel value="paypal" control={<Radio size="small" disabled />} label="Paypal" sx={{ m: 0 }} disabled />
              <Chip label="Próximamente" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
            </Box>
          </RadioGroup>
        </Box>

        {/* ── Políticas de cancelación ── */}
        <Box>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Políticas de cancelación
          </Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Chip label="No reembolsable" size="small" sx={{ bgcolor: 'grey.200', fontWeight: 600, borderRadius: 1 }} />
              <QrCode2Icon sx={{ color: 'text.disabled', fontSize: 40 }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Esta tarifa es no reembolsable. Si modifica o cancela su reserva, no recibirá reembolso ni crédito para una futura estadía.
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', fontStyle: 'italic' }}>
            Finaliza la reserva o hazlo después, retendremos su reserva por un máximo de 15 minutos.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {/* ── Buttons ── */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="warning"
            size="large"
            disabled={!stripe || loading || paymentMethod !== 'credit_card'}
            sx={{ borderRadius: 2, fontWeight: 700, py: 1.5, flex: 1 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : `Reservar ${formatPrice(reservation.grandTotalUsd, currency)}`}
          </Button>
          <Button
            type="button"
            variant="outlined"
            size="large"
            onClick={() => history.back()}
            sx={{ borderRadius: 2, fontWeight: 600, py: 1.5, whiteSpace: 'nowrap' }}
          >
            Finalizar después
          </Button>
        </Box>

      </Box>
    </form>
  );
}
