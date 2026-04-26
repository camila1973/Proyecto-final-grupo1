import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import VerticalCard from '../components/VerticalCard';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { useLocale } from '../context/LocaleContext';
import { formatPrice } from '../utils/currency';
import SearchBarForm from '../components/SearchBarForm';
import { formatAddress } from '../utils/address';
import { todayISO, offsetDateISO } from './search/utils';
import { fetchFeatured } from '../utils/queries';

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currency } = useLocale();

  const { data: featured = [] } = useQuery({
    queryKey: ['featured-properties'],
    queryFn: fetchFeatured,
  });

  return (
    <>
      <section className="bg-[#3a608f] py-12 px-6">
        <div className="max-w-[1152px] mx-auto">
          <h1 className="text-white text-3xl font-bold mb-1">{t('hero.title')}</h1>
          <p className="text-blue-200 text-base mb-8">{t('hero.subtitle')}</p>
          <SearchBarForm />
        </div>
      </section>

      <main className="flex-1 max-w-[1152px] mx-auto w-full px-6 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('recommendations.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {featured.map((result) => (
            <VerticalCard
              key={result.property.id}
              imageUrl={result.property.thumbnailUrl}
              imageAlt={result.property.name}
              onClick={() => navigate({ to: '/properties/$propertyId', params: { propertyId: result.property.id }, search: { checkIn: todayISO(), checkOut: offsetDateISO(2), guests: 2 } })}
              content={
                <>
                  <Typography variant="subtitle2" fontWeight="bold" color="text.primary">{result.property.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{formatAddress(result.property.neighborhood, result.property.city, result.property.countryCode)}</Typography>
                  <Typography variant="h6" fontWeight="bold" color="text.primary">{formatPrice(result.basePriceUsd, currency)}</Typography>
                  <Typography variant="caption" color="text.secondary">{t('recommendations.per_night')}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">{t('recommendations.taxes_not_included')}</Typography>
                </>
              }
              footer={
                <Button size='large' fullWidth variant="contained" color="warning" startIcon={<BookmarkIcon fontSize="small" />}>
                  {t('recommendations.book')}
                </Button>
              }
            />
          ))}
        </div>
      </main>
    </>
  );
}
