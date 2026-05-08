import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import PageHero from '../../../../components/PageHero';

interface RoomHeroBannerProps {
  propertyId: string;
  propertyName: string;
  roomType: string;
  subtitle: string;
}

export default function RoomHeroBanner({ propertyId, propertyName, roomType, subtitle }: RoomHeroBannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <PageHero>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'white', mb: 0.25 }}>
            {roomType}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            {subtitle}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate({ to: '/mi-hotel/$propertyId', params: { propertyId } })}
            sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff', fontSize: 13, '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            {t('partner.room.back')}
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<EditIcon />}
            sx={{ fontSize: 13 }}
          >
            {t('partner.room.edit_room')}
          </Button>
        </Box>
      </Box>
    </PageHero>
  );
}
