import { useTranslation } from 'react-i18next';

export default function ProfilePage() {
  const { t } = useTranslation();
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-800">{t('nav.profile')}</h1>
    </main>
  );
}
