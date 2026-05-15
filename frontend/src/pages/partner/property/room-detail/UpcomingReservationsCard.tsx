import { Box, Card, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { PartnerReservationRow } from '../../../../utils/queries';
import { initials } from './upcomingReservations';

interface UpcomingReservationsCardProps {
  reservations: PartnerReservationRow[];
  isLoading: boolean;
}

function Avatar({ name }: { name: string }) {
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        bgcolor: 'primary.main',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </Box>
  );
}

export default function UpcomingReservationsCard({ reservations, isLoading }: UpcomingReservationsCardProps) {
  const { t } = useTranslation();

  return (
    <Card sx={{ p: 2.5 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, mb: 1.5 }}>
        {t('partner.room.upcoming_title')}
      </Typography>

      {isLoading ? (
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          {t('partner.room.upcoming_loading')}
        </Typography>
      ) : reservations.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          {t('partner.room.upcoming_empty')}
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {reservations.map((r, i) => (
            <Stack
              key={r.id}
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ pb: 1, borderBottom: i < reservations.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}
            >
              <Avatar name={r.guestName} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.guestName}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'monospace' }}>
                  {r.checkIn} → {r.checkOut}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </Card>
  );
}
