import { useTranslation } from 'react-i18next';
import { type CheckoutIntent } from '../../hooks/useBookingFlow';
import { type Currency } from '../../context/LocaleContext';
import { formatPrice } from '../../utils/currency';
import { type ReservationResponse } from './types';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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
}: {
  intent: CheckoutIntent;
  reservation: ReservationResponse | null;
  currency: Currency;
}) {
  const { i18n } = useTranslation();
  const bd = reservation?.fareBreakdown;

  const formatDate = (iso: string, time: string) => {
    return dayjs(iso).locale(i18n.language).format('MMMM DD') + ', ' + time;
  };

  return (
    <Card
      variant="outlined"
      sx={{
        width: { xs: '100%', md: 360 },
        flexShrink: 0,
        alignSelf: 'flex-start',
        position: { md: 'sticky' },
        top: { md: 24 },
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {intent.room.thumbnailUrl && (
        <Box
          component="img"
          src={intent.room.thumbnailUrl}
          alt={intent.property.name}
          sx={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
        />
      )}

      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700} textTransform="uppercase" lineHeight={1.2}>
          {intent.property.name}
        </Typography>

        <Box>
          <Typography variant="body2" fontWeight={700} textTransform="uppercase" color="text.primary">
            {intent.room.type}
          </Typography>
          {intent.room.bedType && (
            <Typography variant="caption" color="text.secondary">
              1 {intent.room.bedType.toLowerCase().replace(/_/g, ' ')}
            </Typography>
          )}
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Check In
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatDate(intent.stay.checkIn, '3:00 PM')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Check Out
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatDate(intent.stay.checkOut, '12:00 PM')}
            </Typography>
          </Box>
        </Box>

        <Divider />

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
            <Divider sx={{ my: 0.5 }} />
            <PriceRow label="Total" value={formatPrice(reservation!.grandTotalUsd, currency)} bold />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        )}
      </Box>
    </Card>
  );
}
