import { Button, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import PartnerHero, { HeroBreadcrumbEyebrow } from '../../components/PartnerHero';

interface RoomHeroBannerProps {
  propertyId: string;
  propertyName: string;
  roomType: string;
  subtitle: string;
  status: string;
}

export default function RoomHeroBanner({
  propertyId,
  propertyName,
  roomType,
  subtitle,
  status,
}: RoomHeroBannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isActive = status === 'active';

  return (
    <PartnerHero
      eyebrow={
        <HeroBreadcrumbEyebrow
          items={[
            { label: propertyName, clickable: true },
            { label: t('partner.room.breadcrumb_rooms') },
            { label: roomType },
          ]}
          onItemClick={(i) => {
            if (i === 0) navigate({ to: '/mi-hotel/$propertyId', params: { propertyId } });
          }}
        />
      }
      title={roomType}
      titleAdornment={
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
      }
      subtitle={subtitle}
      actions={
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate({ to: '/mi-hotel/$propertyId', params: { propertyId } })}
          sx={{
            borderColor: 'rgba(255,255,255,0.3)',
            color: '#fff',
            fontSize: 13,
            '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          {t('partner.room.back')}
        </Button>
      }
    />
  );
}
