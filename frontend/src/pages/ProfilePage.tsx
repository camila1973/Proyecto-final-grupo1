import { useTranslation } from 'react-i18next';

export default function ProfilePage() {
  const { t } = useTranslation();
  return (
    <main className="w-full max-w-[1152px] mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-800">{t('nav.profile')}</h1>
    </main>
  );
}
