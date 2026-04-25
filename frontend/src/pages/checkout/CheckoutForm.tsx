import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { type CheckoutIntent } from '../../hooks/useBookingFlow';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useLocale } from '../../context/LocaleContext';
import { formatPrice } from '../../utils/currency';
import { patchGuestInfo, initiatePayment } from '../../utils/queries';
import { type ReservationResponse } from './types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LabeledField from '../../components/LabeledField';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'Error en el formulario de pago');
      setLoading(false);
      return;
    }

    try {
      await patchGuestInfo(reservation.id, { firstName, lastName, email, phone });
    } catch {
      setError('Error guardando los datos del huésped. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    let clientSecret: string;
    try {
      clientSecret = await initiatePayment({
        reservationId: reservation.id,
        amountUsd: reservation.grandTotalUsd,
        currency: 'usd',
        guestEmail: email,
      });
    } catch {
      setError('Error iniciando el pago. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/booking/confirmation`,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Error procesando el pago');
      setLoading(false);
      return;
    }

    void navigate({
      to: '/booking/confirmation/$id',
      params: { id: reservation.id },
      search: {
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

        {/* ── Detalles del huésped ── */}
        <Box>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Detalles del huésped
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <LabeledField
                label="Nombre"
                uppercase
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
              <LabeledField
                label="Apellido"
                uppercase
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Box>

            <LabeledField
              label="Correo electrónico"
              uppercase
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />

            <LabeledField
              label="Teléfono"
              uppercase
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Box>
        </Box>

        {/* ── Forma de pago ── */}
        <Box>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Forma de pago
          </Typography>
          <PaymentElement />
        </Box>

        {/* ── Políticas de cancelación ── */}
        <Box>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Políticas de cancelación
          </Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Chip label="No reembolsable" size="small" sx={{ bgcolor: 'grey.200', fontWeight: 600, borderRadius: 1 }} />
              <InfoOutlinedIcon sx={{ color: 'text.disabled', fontSize: 40 }} />
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
            disabled={!stripe || loading}
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
