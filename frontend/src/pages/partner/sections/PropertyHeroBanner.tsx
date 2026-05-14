import { Button, IconButton, Tooltip } from '@mui/material';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import PartnerHero, { HeroLabelEyebrow } from '../components/PartnerHero';

interface HeroBannerProps {
  propertyName: string;
  propertyId: string;
  address: string;
}

export default function HeroBanner({ propertyName, propertyId, address }: HeroBannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <PartnerHero
      eyebrow={
        <HeroLabelEyebrow
          label={t('partner.properties.label')}
          code={propertyId ? propertyId.slice(0, 8) : undefined}
        />
      }
      title={propertyName}
      titleAdornment={
        <Tooltip title={t('partner.properties.generate_qr')} placement="right">
          <IconButton
            color="inherit"
            onClick={() =>
              navigate({
                to: '/mi-hotel/$propertyId/editar',
                params: { propertyId },
                search: { tab: 'qr' },
              })
            }
          >
            <QrCode2Icon />
          </IconButton>
        </Tooltip>
      }
      subtitle={address || undefined}
      actions={
        <Button
          variant="contained"
          color="warning"
          startIcon={<EditIcon />}
          onClick={() =>
            navigate({
              to: '/mi-hotel/$propertyId/editar',
              params: { propertyId },
              search: { tab: 'info' },
            })
          }
        >
          {t('partner.properties.edit_property')}
        </Button>
      }
    />
  );
}
