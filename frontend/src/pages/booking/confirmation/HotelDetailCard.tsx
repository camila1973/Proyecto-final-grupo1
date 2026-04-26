import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import VerticalCard from '../../../components/VerticalCard';
import { type ReservationResponse } from '../checkout/types';
import { formatAddress } from '../../../utils/address';

interface Props {
  reservation: ReservationResponse | null;
}

export default function HotelDetailCard({ reservation }: Props) {
  const { t } = useTranslation();
  const nights = reservation
    ? dayjs(reservation.checkOut).diff(dayjs(reservation.checkIn), 'day')
    : null;
  const snapshot = reservation?.snapshot ?? null;

  return (
    <VerticalCard
      imageHeight={200}
      imageUrl={snapshot?.propertyThumbnailUrl ?? 'https://placehold.co/400x200?text=Hotel'}
      sx={{ borderRadius: 2 }}
      content={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            {snapshot
              ? <Typography variant="h6" fontWeight={600}>{snapshot.propertyName}</Typography>
              : <CircularProgress size={16} />
            }
            {snapshot && (
              <Typography variant="caption" color="text.secondary">
                {formatAddress(snapshot.propertyNeighborhood, snapshot.propertyCity, snapshot.propertyCountryCode)}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box sx={{ bgcolor: '#F5F7FA', borderRadius: 1.5, p: 1.5 }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block' }}>
                {t('booking.confirmation.hotel_card.check_in')}
              </Typography>
              {reservation ? (
                <>
                  <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>
                    {dayjs(reservation.checkIn).format('MMM D')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{t('booking.confirmation.hotel_card.check_in_time')}</Typography>
                </>
              ) : (
                <CircularProgress size={16} sx={{ mt: 0.75 }} />
              )}
            </Box>
            <Box sx={{ bgcolor: '#F5F7FA', borderRadius: 1.5, p: 1.5 }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block' }}>
                {t('booking.confirmation.hotel_card.check_out')}
              </Typography>
              {reservation ? (
                <>
                  <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>
                    {dayjs(reservation.checkOut).format('MMM D')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{t('booking.confirmation.hotel_card.check_out_time')}</Typography>
                </>
              ) : (
                <CircularProgress size={16} sx={{ mt: 0.75 }} />
              )}
            </Box>
          </Box>

          <Box sx={{ borderTop: '0.5px solid #e2e8f0', pt: 1.5 }}>
            <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 1 }}>
              {t('booking.confirmation.hotel_card.room_section')}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Box>
                {snapshot
                  ? <Typography variant="body2" fontWeight={500}>{snapshot.roomType}</Typography>
                  : <CircularProgress size={12} sx={{ mt: 0.25 }} />
                }
                {nights !== null
                  ? <Typography variant="caption" color="text.secondary">{t('booking.confirmation.hotel_card.nights', { count: nights })}</Typography>
                  : <CircularProgress size={12} sx={{ mt: 0.25 }} />
                }
              </Box>
              <Chip
                label={t('booking.confirmation.hotel_card.confirmed_chip')}
                size="small"
                sx={{ bgcolor: '#E8EFF7', color: 'primary.main', fontWeight: 500, fontSize: '0.7rem' }}
              />
            </Box>
          </Box>
        </Box>
      }
    />
  );
}
