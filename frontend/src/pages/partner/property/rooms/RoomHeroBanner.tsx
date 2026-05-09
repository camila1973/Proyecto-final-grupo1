import { Box, Button, Chip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import PageHero from '../../../../components/PageHero';

interface RoomHeroBannerProps {
  propertyId: string;
  propertyName: string;
  roomType: string;
  subtitle: string;
  status: string;
}

export default function RoomHeroBanner({ propertyId, propertyName, roomType, subtitle, status }: RoomHeroBannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isActive = status === 'active';

  return (
    <PageHero>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              component="span"
              sx={{ cursor: 'pointer', '&:hover': { color: 'rgba(255,255,255,0.85)' } }}
              onClick={() => navigate({ to: '/mi-hotel/$propertyId', params: { propertyId } })}
            >
              {propertyName}
            </Box>
            <Box component="span" sx={{ opacity: 0.5 }}>›</Box>
            <Box component="span">{t('partner.room.breadcrumb_rooms')}</Box>
            <Box component="span" sx={{ opacity: 0.5 }}>›</Box>
            <Box component="span" sx={{ color: 'rgba(255,255,255,0.85)' }}>{roomType}</Box>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.25 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
              {roomType}
            </Typography>
            <Chip
              size="small"
              label={isActive ? t('partner.room.status_active') : t('partner.room.status_paused')}
              sx={{
                bgcolor: isActive ? 'success.main' : 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
                fontSize: 11,
                height: 22,
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            {subtitle}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate({ to: '/mi-hotel/$propertyId', params: { propertyId } })}
          sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff', fontSize: 13, '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.08)' } }}
        >
          {t('partner.room.back')}
        </Button>
      </Box>
    </PageHero>
  );
}
