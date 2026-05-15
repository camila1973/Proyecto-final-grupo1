import { useTranslation } from 'react-i18next';
import { Alert } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import PageContainer from '../../components/PageContainer';
import MembersSection from './sections/MembersTable';

export default function TeamBody() {
  const { t } = useTranslation();
  const { token, user } = useAuth();

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;

  if (!enabled) {
    return (
      <PageContainer>
        <Alert severity="info">{t('partner.org_dashboard.login_required')}</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <MembersSection partnerId={partnerId} token={token!} />
    </PageContainer>
  );
}
