import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import HotelCard from '../components/HotelCard';
import SearchBarForm from '../components/SearchBarForm';
import { API_BASE } from '../env';
import { formatAddress } from '../utils/address';
import { todayISO, offsetDateISO } from './search/utils';
import type { SearchResponse, SearchResult } from './search/types';

async function fetchFeatured(): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE}/api/search/featured?limit=3`);
  if (!res.ok) throw new Error('Failed to fetch featured properties');
  const data: SearchResponse = await res.json();
  return data.results;
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: featured = [] } = useQuery({
    queryKey: ['featured-properties'],
    queryFn: fetchFeatured,
  });

  return (
    <>
      <section className="bg-[#3a608f] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-white text-3xl font-bold mb-1">{t('hero.title')}</h1>
          <p className="text-blue-200 text-base mb-8">{t('hero.subtitle')}</p>
          <SearchBarForm />
        </div>
      </section>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('recommendations.title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {featured.map((result) => (
            <HotelCard
              key={result.id}
              id={result.id}
              name={result.name}
              location={formatAddress(result.neighborhood, result.city, result.countryCode)}
              price={result.bestRoom.basePriceUsd}
              img={result.thumbnailUrl}
              onClick={() => navigate({ to: '/properties/$propertyId', params: { propertyId: result.id }, search: { checkIn: todayISO(), checkOut: offsetDateISO(2), guests: 2 } })}
            />
          ))}
        </div>
      </main>
    </>
  );
}
