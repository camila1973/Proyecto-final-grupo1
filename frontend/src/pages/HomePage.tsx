import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import HotelCard from '../components/HotelCard';
import SearchBarForm from '../components/SearchBarForm';
import { API_BASE } from '../env';

// Featured property IDs — match the search-service seed data
const FEATURED_IDS = [
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000002',
];

interface PropertySummary {
  propertyId: string;
  propertyName: string;
  city: string;
  neighborhood: string | null;
  thumbnailUrl: string;
  rooms: { basePriceUsd: number }[];
}

async function fetchProperty(id: string): Promise<PropertySummary> {
  const res = await fetch(`${API_BASE}/api/search/properties/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch ${id}`);
  return res.json();
}

function FeaturedCard({ id, onClick }: { id: string; onClick: () => void }) {
  const { data } = useQuery({ queryKey: ['property', id], queryFn: () => fetchProperty(id) });
  if (!data) return null;
  const minPrice = Math.min(...data.rooms.map((r) => r.basePriceUsd));
  return (
    <HotelCard
      id={data.propertyId}
      name={data.propertyName}
      location={`${data.neighborhood ?? data.city}, ${data.city}`}
      price={minPrice}
      img={data.thumbnailUrl}
      onClick={onClick}
    />
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
          {FEATURED_IDS.map((id) => (
            <FeaturedCard
              key={id}
              id={id}
              onClick={() => navigate({ to: '/properties/$propertyId', params: { propertyId: id } })}
            />
          ))}
        </div>
      </main>
    </>
  );
}
