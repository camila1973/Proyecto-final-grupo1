import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
        <span>{t('footer.copyright')}</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-gray-700">{t('footer.privacy')}</a>
          <a href="#" className="hover:text-gray-700">{t('footer.terms')}</a>
        </div>
        <div className="flex gap-4">
          <span>{t('footer.language')}</span>
          <span>{t('footer.currency')}</span>
        </div>
      </div>
    </footer>
  );
}
