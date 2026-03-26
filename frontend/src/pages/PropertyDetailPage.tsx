import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../context/LocaleContext';

interface Room {
  roomId: string;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  basePriceUsd: number;
  priceUsd: number | null;
  availabilityFrom: string | null;
  availabilityTo: string | null;
}

interface PropertyDetail {
  propertyId: string;
  propertyName: string;
  city: string;
  country: string;
  neighborhood: string | null;
  stars: number;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  amenities: string[];
  rooms: Room[];
}

const CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  COP: 4200,
  EUR: 0.92,
};

function formatPrice(usd: number, currency: string): string {
  const rate = CURRENCY_RATES[currency] ?? 1;
  const converted = Math.round(usd * rate);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(converted);
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function fetchProperty(propertyId: string): Promise<PropertyDetail> {
  const res = await fetch(`${API_BASE}/api/search/properties/${propertyId}`);
  if (!res.ok) throw new Error(`Failed to fetch property ${propertyId}`);
  return res.json() as Promise<PropertyDetail>;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill={i < stars ? '#e8c84a' : 'none'}
          stroke="#e8c84a"
          strokeWidth="1.2"
        >
          <polygon points="7,1 8.8,5.4 13.6,5.4 9.8,8.2 11.1,12.6 7,9.8 2.9,12.6 4.2,8.2 0.4,5.4 5.2,5.4" />
        </svg>
      ))}
    </span>
  );
}

function ImageCarousel({ src, name }: { src: string; name: string }) {
  // With a real backend this would cycle through multiple images;
  // for now we show the single thumbnail provided by the API.
  return (
    <div className="relative w-full h-72 md:h-96 rounded-2xl overflow-hidden bg-gray-200">
      <img src={src} alt={name} className="w-full h-full object-cover" />
    </div>
  );
}

export default function PropertyDetailPage() {
  const { t } = useTranslation();
  const { currency } = useLocale();
  const { propertyId } = useParams({ from: '/properties/$propertyId' });
  const navigate = useNavigate();

  const { data, isPending, isError } = useQuery<PropertyDetail>({
    queryKey: ['property', propertyId],
    queryFn: () => fetchProperty(propertyId),
  });

  if (isPending) {
    return (
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <p className="text-gray-500">{t('property_detail.loading')}</p>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <p className="text-red-500">{t('property_detail.error')}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
      <button
        onClick={() => navigate({ to: '/' })}
        className="flex items-center gap-2 text-sm text-[#4a6fa5] hover:text-[#3a5f95] mb-6 font-medium"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {t('property_detail.back')}
      </button>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Hero image carousel */}
        <div className="p-6 pb-0">
          <ImageCarousel src={data.thumbnailUrl} name={data.propertyName} />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{data.propertyName}</h1>
              <p className="text-gray-500 text-sm">
                {data.neighborhood ? `${data.neighborhood}, ` : ''}
                {data.city}, {data.country}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <StarRating stars={data.stars} />
                <span className="text-sm text-gray-600">
                  {data.rating.toFixed(1)} · {data.reviewCount} {t('property_detail.reviews').toLowerCase()}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(data.rooms[0]?.priceUsd ?? data.rooms[0]?.basePriceUsd ?? 0, currency)}
              </p>
              <p className="text-xs text-gray-400">{t('property_detail.per_night')}</p>
            </div>
          </div>

          {/* Amenities */}
          {data.amenities.length > 0 && (
            <section className="mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">{t('property_detail.amenities')}</h2>
              <div className="flex flex-wrap gap-2">
                {data.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Rooms */}
          {data.rooms.length > 0 && (
            <section className="mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">{t('property_detail.rooms')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.rooms.map((room) => (
                  <div
                    key={room.roomId}
                    className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm text-gray-900 capitalize">{room.roomType}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {room.bedType} · {room.viewType}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatPrice(room.priceUsd ?? room.basePriceUsd, currency)}
                        </p>
                        <p className="text-xs text-gray-400">{t('property_detail.per_night')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {t('property_detail.capacity')}: {room.capacity} {t('property_detail.guests')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          room.availabilityFrom
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${room.availabilityFrom ? 'bg-green-500' : 'bg-gray-400'}`}
                        />
                        {room.availabilityFrom
                          ? t('property_detail.available')
                          : t('property_detail.unavailable')}
                      </span>
                      <button className="ml-auto flex items-center justify-center gap-1.5 bg-[#e8c84a] hover:bg-[#d4b53a] text-gray-900 font-semibold text-xs px-4 py-1.5 rounded-lg transition-colors">
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M4 3V2M10 3V2M1 6h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        {t('property_detail.book_now')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
