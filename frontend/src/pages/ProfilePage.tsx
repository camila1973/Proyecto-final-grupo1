import { useTranslation } from 'react-i18next';
import PageContainer from '../components/PageContainer';

export default function ProfilePage() {
  const { t } = useTranslation();
  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-gray-800">{t('nav.profile')}</h1>
    </PageContainer>
  );
}
