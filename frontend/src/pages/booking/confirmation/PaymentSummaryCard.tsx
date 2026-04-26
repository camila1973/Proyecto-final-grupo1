import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useLocale } from '../../../context/LocaleContext';
import { formatPrice } from '../../../utils/currency';
import VerticalCard from '../../../components/VerticalCard';
import { type FareBreakdown } from '../checkout/types';

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

interface Props {
  totalUsd: number;
  fareBreakdown: FareBreakdown | undefined;
}

export default function PaymentSummaryCard({ totalUsd, fareBreakdown: bd }: Props) {
  const { currency } = useLocale();

  return (
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
                <Typography variant="h6" fontWeight={500} color="primary.main" lineHeight={1.2}>
                  {formatPrice(totalUsd, currency)}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}
        </>
      }
    />
  );
}
