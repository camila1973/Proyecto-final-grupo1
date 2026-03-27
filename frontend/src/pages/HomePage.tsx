import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import HotelCard from '../components/HotelCard';
import { API_BASE } from '../env';
import { todayISO, offsetDateISO } from './search/utils';

// Featured property IDs — match the search-service seed data
const FEATURED_IDS = [
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000002',
];

const CURRENCY_RATES: Record<string, number> = { USD: 1, COP: 4200, EUR: 0.92 };

function formatPrice(usd: number): string {
  const converted = Math.round(usd * CURRENCY_RATES['COP']);
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(converted);
}

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
      price={formatPrice(minPrice)}
      img={data.thumbnailUrl}
      onClick={onClick}
    />
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [formCity, setFormCity] = useState('');
  const [formCheckIn, setFormCheckIn] = useState(todayISO);
  const [formCheckOut, setFormCheckOut] = useState(() => offsetDateISO(2));
  const [formGuests, setFormGuests] = useState(2);

  function handleSearch() {
    navigate({
      to: '/search',
      search: {
        city: formCity,
        checkIn: formCheckIn,
        checkOut: formCheckOut,
        guests: formGuests,
      },
    });
  }

  return (
    <>
      <section className="bg-[#4a6fa5] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-white text-3xl font-bold mb-1">{t('hero.title')}</h1>
          <p className="text-blue-200 text-base mb-8">{t('hero.subtitle')}</p>

          <div className="bg-white rounded-xl p-4 flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex flex-col">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('hero.destination_label')}
              </label>
              <input
                type="text"
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('hero.destination_placeholder')}
                className="text-sm text-gray-700 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-400 pb-1"
              />
            </div>

            <div className="hidden md:block w-px bg-gray-200 my-1" />

            <div className="flex-1 flex flex-col">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('hero.dates_label')}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={formCheckIn}
                  onChange={(e) => setFormCheckIn(e.target.value)}
                  className="text-sm text-gray-700 outline-none border-b border-transparent focus:border-blue-400 pb-1 w-full"
                />
                <span className="text-gray-400 text-xs flex-shrink-0">→</span>
                <input
                  type="date"
                  value={formCheckOut}
                  onChange={(e) => setFormCheckOut(e.target.value)}
                  className="text-sm text-gray-700 outline-none border-b border-transparent focus:border-blue-400 pb-1 w-full"
                />
              </div>
            </div>

            <div className="hidden md:block w-px bg-gray-200 my-1" />

            <div className="flex-1 flex flex-col">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('hero.guests_label')}
              </label>
              <input
                type="number"
                min="1"
                value={formGuests}
                onChange={(e) => setFormGuests(Number(e.target.value))}
                placeholder={t('hero.guests_placeholder')}
                className="text-sm text-gray-700 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-400 pb-1"
              />
            </div>

            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 bg-[#e8c84a] hover:bg-[#d4b53a] text-gray-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              {t('hero.search')}
            </button>
          </div>
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
