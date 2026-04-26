import { useTranslation } from 'react-i18next';
import { type CheckoutIntent } from '../../../hooks/useBookingFlow';
import { type Currency } from '../../../context/LocaleContext';
import { formatPrice } from '../../../utils/currency';
import { type ReservationResponse } from './types';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';
import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import VerticalCard from '../../../components/VerticalCard';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

function PriceRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
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

export function SummaryPanel({
  intent,
  reservation,
  currency,
  formLoading,
}: {
  intent: CheckoutIntent;
  reservation: ReservationResponse | null;
  currency: Currency;
  formLoading: boolean;
}) {
  const { i18n } = useTranslation();
  const bd = reservation?.fareBreakdown;

  const formatDate = (iso: string, time: string) => {
    return dayjs(iso).locale(i18n.language).format('MMM D') + ' · ' + time;
  };

  return (
    <Box sx={{
      width: '100%',
      flexShrink: 0,
      alignSelf: 'flex-start',
      position: { md: 'sticky' },
      top: { md: 24 },
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>

      {/* ── Hotel info card ── */}
      <VerticalCard
        imageUrl={intent.room.thumbnailUrl}
        imageAlt={intent.property.name}
        imageFallbackUrl="https://placehold.co/400x130?text=Hotel"
        imageHeight={130}
        sx={{ borderRadius: 2 }}
        content={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={500} lineHeight={1.2}>
                {intent.property.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                <StarIcon sx={{ fontSize: 13, color: 'warning.main' }} />
                <Typography variant="caption" fontWeight={600}>4.6</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Box sx={{ bgcolor: '#F5F7FA', borderRadius: 1.5, p: 1.25 }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block' }}>
                  Check-in
                </Typography>
                <Typography variant="body2" fontWeight={600}>{formatDate(intent.stay.checkIn, '3:00 PM')}</Typography>
              </Box>
              <Box sx={{ bgcolor: '#F5F7FA', borderRadius: 1.5, p: 1.25 }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block' }}>
                  Check-out
                </Typography>
                <Typography variant="body2" fontWeight={600}>{formatDate(intent.stay.checkOut, '12:00 PM')}</Typography>
              </Box>
            </Box>

            <Box sx={{ borderTop: '0.5px solid #e2e8f0', pt: 1.5 }}>
              <Typography variant="body2" fontWeight={500} textTransform="uppercase">
                {intent.room.type}
              </Typography>
              {intent.room.bedType && (
                <Typography variant="caption" color="text.secondary">
                  1 {intent.room.bedType.toLowerCase().replace(/_/g, ' ')}
                </Typography>
              )}
            </Box>
          </Box>
        }
      />

      {/* ── Price summary card ── */}
      <VerticalCard
        contentPadding={2.5}
        sx={{ borderRadius: 2 }}
        content={
          <>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1.75 }}>Resumen de pago</Typography>

            {bd ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <PriceRow label="Precio por noche" value={formatPrice(bd.roomRateUsd, currency)} />
                <PriceRow label="Subtotal" value={formatPrice(bd.subtotalUsd, currency)} />
                {bd.taxes.map((t) => (
                  <PriceRow key={t.name} label={t.name} value={formatPrice(t.amountUsd, currency)} />
                ))}
                {bd.fees.map((f) => (
                  <PriceRow key={f.name} label={f.name} value={formatPrice(f.totalUsd, currency)} />
                ))}
                <Divider sx={{ my: 0.75 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="body2" fontWeight={500}>Total</Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" fontWeight={500} color="primary.main" lineHeight={1.2}>
                      {formatPrice(reservation!.grandTotalUsd, currency)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Impuestos incluidos</Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2.5 }}>
              <Button
                type="submit"
                form="checkout-form"
                variant="contained"
                color="warning"
                fullWidth
                size="large"
                disabled={formLoading || !reservation}
                startIcon={formLoading ? undefined : <LockIcon sx={{ fontSize: 14 }} />}
                sx={{ borderRadius: 1.5, fontWeight: 500, py: 1.5 }}
              >
                {formLoading ? <CircularProgress size={22} color="inherit" /> : 'Reservar ahora'}
              </Button>
              <Button
                type="button"
                variant="outlined"
                fullWidth
                size="large"
                onClick={() => history.back()}
                sx={{ borderRadius: 1.5, fontWeight: 500, borderColor: 'primary.main', color: 'primary.main' }}
              >
                Finalizar después
              </Button>
            </Box>

            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
              mt: 1.5, bgcolor: '#F5F7FA', borderRadius: 1.5, p: '8px 10px',
            }}>
              <AccessTimeIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Mantenemos tu reserva por 15 minutos
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 1 }}>
              <LockIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">
                Pago seguro cifrado · TLS 1.3
              </Typography>
            </Box>
          </>
        }
      />

    </Box>
  );
}
