import { Box, Button, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import PageHero from '../../../components/PageHero';


interface HeroBannerProps {
  orgName: string;
  identifier: string;
  userName: string;
  role: string;
}

export default function HeroBanner({ orgName, identifier, userName, role }: HeroBannerProps) {
  const { t } = useTranslation();
  return (
    <PageHero>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: 11, color: 'white', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            {t('partner.org_dashboard.org_label')}
            {identifier && (
              <Box component="span" sx={{ textTransform: 'none', letterSpacing: 0, opacity: 0.7, fontWeight: 400 }}>
                {identifier}
              </Box>
            )}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'white', mt: 0.5, mb: 0.25 }}>
            {orgName}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'white' }}>
            {userName} · {role ? t(`partner.org_dashboard.roles.${role}`, { defaultValue: role }) : ''}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="warning"
          startIcon={<EditIcon />}
        >
          {t('partner.org_dashboard.edit_org')}
        </Button>
      </Box>
    </PageHero>
  );
}
