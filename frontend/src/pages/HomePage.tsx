import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import HotelCard from '../components/HotelCard';

// Featured properties — IDs match the search-service seed data
const recommendations = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    name: 'Gran Caribe Resort & Spa',
    location: 'Zona Hotelera, Cancún',
    price: '1,302,000',
    img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=220&fit=crop',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000004',
    name: 'Hotel Histórico Centro',
    location: 'Centro Histórico, Ciudad de México',
    price: '1,134,000',
    img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=220&fit=crop',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    name: 'Playa Azul Hotel',
    location: 'Zona Hotelera, Cancún',
    price: '567,000',
    img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=220&fit=crop',
  },
];

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
                placeholder={t('hero.destination_placeholder')}
                className="text-sm text-gray-700 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-400 pb-1"
              />
            </div>

            <div className="hidden md:block w-px bg-gray-200 my-1" />

            <div className="flex-1 flex flex-col">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('hero.dates_label')}
              </label>
              <input
                type="text"
                placeholder={t('hero.dates_placeholder')}
                className="text-sm text-gray-700 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-400 pb-1"
              />
            </div>

            <div className="hidden md:block w-px bg-gray-200 my-1" />

            <div className="flex-1 flex flex-col">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('hero.guests_label')}
              </label>
              <input
                type="text"
                placeholder={t('hero.guests_placeholder')}
                className="text-sm text-gray-700 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-400 pb-1"
              />
            </div>

            <button className="flex items-center justify-center gap-2 bg-[#e8c84a] hover:bg-[#d4b53a] text-gray-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap">
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
          {recommendations.map((hotel) => (
            <HotelCard
              key={hotel.id}
              {...hotel}
              onClick={() => navigate({ to: '/properties/$propertyId', params: { propertyId: hotel.id } })}
            />
          ))}
        </div>
      </main>
    </>
  );
}
