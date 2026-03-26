import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../context/LocaleContext';
import { API_BASE } from '../env';

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

async function fetchProperty(propertyId: string): Promise<PropertyDetail> {
  const res = await fetch(`${API_BASE}/api/search/properties/${propertyId}`);
  if (!res.ok) throw new Error(`Failed to fetch property ${propertyId}`);
  return res.json() as Promise<PropertyDetail>;
}

const AMENITY_LABELS: Record<string, string> = {
  pool: 'Piscina',
  wifi: 'WiFi',
  spa: 'Spa',
  restaurant: 'Restaurante',
  breakfast: 'Desayuno incluido',
  ac: 'Aire acondicionado',
  beach_access: 'Acceso a playa',
  gym: 'Gimnasio',
  parking: 'Estacionamiento',
  pet_friendly: 'Acepta mascotas',
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  deluxe: 'Habitación Deluxe',
  suite: 'Suite',
  standard: 'Habitación Estándar',
  junior_suite: 'Junior Suite',
  penthouse: 'Penthouse',
};

const BED_TYPE_LABELS: Record<string, string> = {
  king: '1 cama king',
  queen: '1 cama queen',
  double: '1 cama doble',
  twin: '2 camas individuales',
};

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

  const address = [data.neighborhood, data.city, data.country].filter(Boolean).join(', ');
  const availableRooms = data.rooms.filter((r) => r.availabilityFrom);

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate({ to: '/' })}
        className="flex items-center gap-2 text-sm text-[#4a6fa5] hover:text-[#3a5f95] mb-6 font-medium"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {t('property_detail.back')}
      </button>

      {/* Image gallery — 3 panels using the same thumbnail */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden mb-6 h-64">
        {[0, 1, 2].map((i) => (
          <img
            key={i}
            src={data.thumbnailUrl}
            alt={data.propertyName}
            className="w-full h-full object-cover"
          />
        ))}
      </div>

      {/* Property header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 uppercase mb-1">{data.propertyName}</h1>
          <p className="text-gray-500 text-sm">{address}</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1a2e4a] hover:bg-[#162540] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Seleccionar habitacion
        </button>
      </div>

      {/* About */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-2">Acerca del hotel</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          {data.propertyName} está ubicado en {address}. Ofrece instalaciones de primera clase y un servicio excepcional para garantizar la comodidad de sus huéspedes durante toda su estadía.
        </p>
      </section>

      {/* Amenities */}
      {data.amenities.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">{t('property_detail.amenities')}</h2>
          <div className="flex flex-wrap gap-2">
            {data.amenities.map((amenity) => (
              <span
                key={amenity}
                className="border border-gray-300 text-gray-700 text-sm px-4 py-1.5 rounded-full"
              >
                {AMENITY_LABELS[amenity] ?? amenity}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Rooms */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{t('property_detail.rooms')}</h2>
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">{availableRooms.length} habitaciones</span> disponibles encontradas
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar filters */}
          <div className="md:w-56 shrink-0 flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Check in / Out</p>
              <div className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700">
                Mar 1 - Mar 9
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Viajeros</p>
              <div className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700">
                2 Viajeros - 1 Habitación
              </div>
            </div>
          </div>

          {/* Room list */}
          <div className="flex-1 flex flex-col gap-4">
            {data.rooms.map((room) => {
              const pricePerNight = room.priceUsd ?? room.basePriceUsd;
              const nights = 8;
              const totalPrice = pricePerNight * nights;
              const roomLabel = ROOM_TYPE_LABELS[room.roomType] ?? room.roomType;
              const bedLabel = BED_TYPE_LABELS[room.bedType] ?? room.bedType;

              return (
                <div
                  key={room.roomId}
                  className="flex gap-4 border border-gray-200 rounded-xl overflow-hidden p-4"
                >
                  <img
                    src={data.thumbnailUrl}
                    alt={roomLabel}
                    className="w-28 h-24 object-cover rounded-lg shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-gray-900 uppercase text-sm mb-1">{roomLabel}</p>
                      <ul className="text-xs text-gray-500 space-y-0.5 list-disc list-inside">
                        <li>Capacidad para {room.capacity} huéspedes</li>
                        <li>Posee {bedLabel}</li>
                      </ul>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatPrice(pricePerNight, currency)} {t('property_detail.per_night')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{formatPrice(totalPrice, currency)}</p>
                      <p className="text-xs text-gray-400">por {nights} noches</p>
                    </div>
                    <button className="flex items-center gap-1.5 bg-[#e8c84a] hover:bg-[#d4b53a] text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M4 3V2M10 3V2M1 6h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Reservar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
