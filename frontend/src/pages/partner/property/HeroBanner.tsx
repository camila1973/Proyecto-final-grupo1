import { Box, Button, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslation } from 'react-i18next';
import PageHero from '../../../components/PageHero';

interface HeroBannerProps {
  propertyName: string;
  propertyId: string;
  address: string;
}

export default function HeroBanner({ propertyName, propertyId, address }: HeroBannerProps) {
  const { t } = useTranslation();

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
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'white', mt: 0.5, mb: 0.25 }}>
            {propertyName}
          </Typography>
          {address && (
            <Typography sx={{ fontSize: 12, color: 'white', opacity: 0.85 }}>
              {address}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          color="warning"
          size="large"
          startIcon={<SettingsIcon sx={{ fontSize: 16 }} />}
          sx={{ fontSize: 13, fontWeight: 500, px: 2 }}
        >
          {t('partner.properties.edit_property')}
        </Button>
      </Box>
    </PageHero>
  );
}
