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
import Box from '@mui/material/Box';
import VerticalCard from '../../../components/VerticalCard';
import { formatAddress } from '../../../utils/address';
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
  const { t, i18n } = useTranslation();
  const bd = reservation?.fareBreakdown;

  const formatDate = (iso: string, time: string) => {
    const formatted = dayjs(iso).locale(i18n.language).format('MMM D');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1) + ' · ' + time;
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
        imageUrl={reservation?.snapshot?.propertyThumbnailUrl ?? intent.room.thumbnailUrl}
        imageAlt={reservation?.snapshot?.propertyName ?? intent.property.name}
        imageFallbackUrl="https://placehold.co/400x130?text=Hotel"
        imageHeight={130}
        sx={{ borderRadius: 2 }}
        content={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} lineHeight={1.2}>
                {reservation?.snapshot?.propertyName ?? intent.property.name}
              </Typography>
              {reservation?.snapshot && (
                <Typography variant="caption" color="text.secondary">
                  {formatAddress(reservation.snapshot.propertyNeighborhood, reservation.snapshot.propertyCity, reservation.snapshot.propertyCountryCode)}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Box sx={{ bgcolor: '#F5F7FA', borderRadius: 1.5, p: 1.25 }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block' }}>
                  {t('booking.checkout.summary.check_in')}
                </Typography>
                <Typography variant="body2" fontWeight={600}>{formatDate(intent.stay.checkIn, t('booking.checkout.summary.check_in_time'))}</Typography>
              </Box>
              <Box sx={{ bgcolor: '#F5F7FA', borderRadius: 1.5, p: 1.25 }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block' }}>
                  {t('booking.checkout.summary.check_out')}
                </Typography>
                <Typography variant="body2" fontWeight={600}>{formatDate(intent.stay.checkOut, t('booking.checkout.summary.check_out_time'))}</Typography>
              </Box>
            </Box>
            <Divider />
            <Typography variant="subtitle1" fontWeight={600} textTransform="uppercase">
              {`${t('booking.checkout.summary.room_type_label')} ${reservation?.snapshot?.roomType ?? intent.room.type}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('booking.checkout.summary.guests', { count: intent.stay.guests })} · {t('booking.checkout.summary.nights', { count: dayjs(intent.stay.checkOut).diff(dayjs(intent.stay.checkIn), 'day') })}
            </Typography>
          </Box>
        }
      />

      {/* ── Price summary card ── */}
      <VerticalCard
        contentPadding={2.5}
        sx={{ borderRadius: 2 }}
        content={
          <>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.75 }}>{t('booking.checkout.summary.title')}</Typography>

            {bd ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <PriceRow label={t('booking.checkout.summary.price_per_night')} value={formatPrice(bd.roomRateUsd, currency)} />
                <PriceRow label={t('booking.checkout.summary.subtotal')} value={formatPrice(bd.subtotalUsd, currency)} />
                {bd.taxes.map((tx) => (
                  <PriceRow key={tx.name} label={tx.name} value={formatPrice(tx.amountUsd, currency)} />
                ))}
                {bd.fees.map((f) => (
                  <PriceRow key={f.name} label={f.name} value={formatPrice(f.totalUsd, currency)} />
                ))}
                <Divider sx={{ my: 0.75 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="body2" fontWeight={500}>{t('booking.checkout.summary.total')}</Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" fontWeight={500} color="primary.main" lineHeight={1.2}>
                      {formatPrice(reservation!.grandTotalUsd, currency)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{t('booking.checkout.summary.taxes_included')}</Typography>
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
                {formLoading ? <CircularProgress size={22} color="inherit" /> : t('booking.checkout.summary.book_now')}
              </Button>
              <Button
                type="button"
                variant="outlined"
                fullWidth
                size="large"
                onClick={() => history.back()}
                sx={{ borderRadius: 1.5, fontWeight: 500, borderColor: 'primary.main', color: 'primary.main' }}
              >
                {t('booking.checkout.summary.finish_later')}
              </Button>
            </Box>

            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
              mt: 1.5, bgcolor: '#F5F7FA', borderRadius: 1.5, p: '8px 10px',
            }}>
              <AccessTimeIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {t('booking.checkout.summary.hold_notice')}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 1 }}>
              <LockIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">
                {t('booking.checkout.summary.secure_payment')}
              </Typography>
            </Box>
          </>
        }
      />

    </Box>
  );
}
