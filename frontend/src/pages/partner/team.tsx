import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { fetchPartner } from '../../utils/queries';
import PageContainer from '../../components/PageContainer';
import HeroBanner from './sections/PartnerHeroBanner';
import { PartnerTopTabs } from './components/PartnerTabs';
import MembersSection from './sections/MembersTable';

export default function PartnerTeamPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;

  const partnerQuery = useQuery({
    queryKey: ['partner', partnerId],
    queryFn: () => fetchPartner(partnerId, token!),
    enabled,
  });

  if (!enabled) {
    return (
      <PageContainer>
        <Alert severity="info">{t('partner.org_dashboard.login_required')}</Alert>
      </PageContainer>
    );
  }

  return (
    <div className="min-h-screen">
      <HeroBanner
        orgName={partnerQuery.data?.name ?? ''}
        identifier={partnerQuery.data?.identifier ?? ''}
        userName={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || ''}
        role={user?.role ?? ''}
      />
      <PartnerTopTabs active="equipo" />
      <PageContainer>
        <MembersSection partnerId={partnerId} token={token!} />
      </PageContainer>
    </div>
  );
}
