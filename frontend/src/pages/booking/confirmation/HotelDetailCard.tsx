import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import StarIcon from '@mui/icons-material/Star';
import dayjs from 'dayjs';
import VerticalCard from '../../../components/VerticalCard';
import { type ReservationResponse } from '../checkout/types';

interface Props {
  propertyName: string;
  roomType: string;
  reservation: ReservationResponse | null;
}

export default function HotelDetailCard({ propertyName, roomType, reservation }: Props) {
  const nights = reservation
    ? dayjs(reservation.checkOut).diff(dayjs(reservation.checkIn), 'day')
    : null;

  return (
    <VerticalCard
      imageHeight={200}
      imageUrl="https://placehold.co/400x200?text=Hotel"
      sx={{ borderRadius: 2 }}
      content={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Typography variant="h6" fontWeight={500}>{propertyName}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
              <Typography variant="caption" fontWeight={600}>4.6</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box sx={{ bgcolor: '#F5F7FA', borderRadius: 1.5, p: 1.5 }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block' }}>
                Check-in
              </Typography>
              {reservation ? (
                <>
                  <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>
                    {dayjs(reservation.checkIn).format('MMM D')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Desde 3:00 PM</Typography>
                </>
              ) : (
                <CircularProgress size={16} sx={{ mt: 0.75 }} />
              )}
            </Box>
            <Box sx={{ bgcolor: '#F5F7FA', borderRadius: 1.5, p: 1.5 }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block' }}>
                Check-out
              </Typography>
              {reservation ? (
                <>
                  <Typography variant="body1" fontWeight={500} sx={{ mt: 0.5 }}>
                    {dayjs(reservation.checkOut).format('MMM D')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Hasta 12:00 PM</Typography>
                </>
              ) : (
                <CircularProgress size={16} sx={{ mt: 0.75 }} />
              )}
            </Box>
          </Box>

          <Box sx={{ borderTop: '0.5px solid #e2e8f0', pt: 1.5 }}>
            <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', display: 'block', mb: 1 }}>
              Habitación
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Box>
                <Typography variant="body2" fontWeight={500}>{roomType}</Typography>
                {nights !== null
                  ? <Typography variant="caption" color="text.secondary">{nights} {nights === 1 ? 'noche' : 'noches'}</Typography>
                  : <CircularProgress size={12} sx={{ mt: 0.25 }} />
                }
              </Box>
              <Chip
                label="Confirmado"
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
