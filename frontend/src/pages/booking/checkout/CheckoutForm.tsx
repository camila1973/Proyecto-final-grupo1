import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { type CheckoutIntent } from '../../../hooks/useBookingFlow';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { patchGuestInfo, initiatePayment } from '../../../utils/queries';
import { type ReservationResponse } from './types';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LabeledField from '../../../components/LabeledField';
import VerticalCard from '../../../components/VerticalCard';

export function CheckoutForm({
  reservation,
  intent,
  email: initialEmail,
  firstName: initialFirstName,
  lastName: initialLastName,
  phone: initialPhone,
  setLoading: setLoadingProp,
}: {
  reservation: ReservationResponse;
  intent: CheckoutIntent;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  setLoading?: (v: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState(initialFirstName ?? '');
  const [lastName, setLastName] = useState(initialLastName ?? '');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const setLoadingBoth = (v: boolean) => {
    setLoadingProp?.(v);
  };

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = 'El nombre es obligatorio';
    if (!lastName.trim()) errors.lastName = 'El apellido es obligatorio';
    if (!email.trim()) {
      errors.email = 'El correo electrónico es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Ingresa un correo electrónico válido';
    }
    if (!phone.trim()) errors.phone = 'El teléfono es obligatorio';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!validate()) return;
    setLoadingBoth(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'Error en el formulario de pago');
      setLoadingBoth(false);
      return;
    }

    try {
      await patchGuestInfo(reservation.id, { firstName, lastName, email, phone });
    } catch {
      setError('Error guardando los datos del huésped. Intenta de nuevo.');
      setLoadingBoth(false);
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
      setLoadingBoth(false);
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
      setLoadingBoth(false);
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

  const numberedCircle = (n: number) => (
    <Box sx={{
      width: 24, height: 24, borderRadius: '50%', bgcolor: '#E8EFF7', color: 'primary.main',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0,
    }}>{n}</Box>
  );

  return (
    <form id="checkout-form" onSubmit={handleSubmit} style={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* ── Detalles del huésped ── */}
        <VerticalCard
          contentPadding={2.5}
          sx={{ borderRadius: 2 }}
          content={
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
                {numberedCircle(1)}
                <Typography variant="subtitle1" fontWeight={500}>Detalles del huésped</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <LabeledField
                    label="Nombre"
                    uppercase
                    value={firstName}
                    error={!!fieldErrors.firstName}
                    helperText={fieldErrors.firstName}
                    onChange={(e) => { setFirstName(e.target.value); clearFieldError('firstName'); }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                  <LabeledField
                    label="Apellido"
                    uppercase
                    value={lastName}
                    error={!!fieldErrors.lastName}
                    helperText={fieldErrors.lastName}
                    onChange={(e) => { setLastName(e.target.value); clearFieldError('lastName'); }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Box>
                <LabeledField
                  label="Correo electrónico"
                  uppercase
                  type="email"
                  value={email}
                  error={!!fieldErrors.email}
                  helperText={fieldErrors.email || 'Te enviaremos la confirmación a este correo'}
                  onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
                <LabeledField
                  label="Teléfono"
                  uppercase
                  type="tel"
                  value={phone}
                  error={!!fieldErrors.phone}
                  helperText={fieldErrors.phone}
                  onChange={(e) => { setPhone(e.target.value); clearFieldError('phone'); }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </Box>
            </>
          }
        />

        {/* ── Forma de pago ── */}
        <VerticalCard
          contentPadding={2.5}
          sx={{ borderRadius: 2 }}
          content={
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
                {numberedCircle(2)}
                <Typography variant="subtitle1" fontWeight={500}>Forma de pago</Typography>
              </Box>
              <PaymentElement />
            </>
          }
        />

        {/* ── Tarifa no reembolsable ── */}
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          <AlertTitle sx={{ fontWeight: 500, mb: 0.25 }}>Tarifa no reembolsable</AlertTitle>
          Si modificas o cancelas la reserva, no recibirás reembolso ni crédito para una estancia futura.
        </Alert>

        {error && <Alert severity="error">{error}</Alert>}

      </Box>
    </form>
  );
}
