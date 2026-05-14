import { Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import PartnerHero, { HeroLabelEyebrow } from '../components/PartnerHero';

interface HeroBannerProps {
  orgName: string;
  identifier: string;
  userName: string;
  role: string;
}

export default function HeroBanner({ orgName, identifier, userName, role }: HeroBannerProps) {
  const { t } = useTranslation();
  return (
    <PartnerHero
      eyebrow={<HeroLabelEyebrow label={t('partner.org_dashboard.org_label')} code={identifier} />}
      title={orgName}
      subtitle={`${userName} · ${role ? t(`partner.org_dashboard.roles.${role}`, { defaultValue: role }) : ''}`}
      actions={
        <Button variant="contained" color="warning" startIcon={<EditIcon />}>
          {t('partner.org_dashboard.edit_org')}
        </Button>
      }
    />
  );
}
