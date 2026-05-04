import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import PageHero from '../../../components/PageHero';

interface HeroBannerProps {
  propertyName: string;
  propertyId: string;
  address: string;
}

export default function HeroBanner({ propertyName, propertyId, address }: HeroBannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <PageHero>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: 11, color: 'white', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            {t('partner.properties.label')}
            {propertyId && (
              <Box component="span" sx={{ textTransform: 'none', letterSpacing: 0, opacity: 0.7, fontWeight: 400 }}>
                {propertyId.slice(0, 8)}
              </Box>
            )}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 0.25 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
              {propertyName}
            </Typography>
            <Tooltip title={t('partner.properties.generate_qr')} placement="right">
              <IconButton
                color="inherit"
                onClick={() => navigate({ to: '/mi-hotel/$propertyId/qr', params: { propertyId } })}
              >
                <QrCode2Icon />
              </IconButton>
            </Tooltip>
          </Box>
          {address && (
            <Typography sx={{ fontSize: 12, color: 'white', opacity: 0.85 }}>
              {address}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          color="warning"
          startIcon={<EditIcon />}
        >
          {t('partner.properties.edit_property')}
        </Button>
      </Box>
    </PageHero>
  );
}
