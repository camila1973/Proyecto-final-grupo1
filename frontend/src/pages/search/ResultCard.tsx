import { useTranslation } from 'react-i18next';
import type { SearchResult, LabelMap } from './types';
import { formatCOP, resolveLabel } from './utils';

interface ResultCardProps {
  result: SearchResult;
  nights: number;
  amenityLabels: LabelMap;
  roomTypeLabels: LabelMap;
  onBook: () => void;
}

export default function ResultCard({
  result,
  nights,
  amenityLabels,
  roomTypeLabels,
  onBook,
}: ResultCardProps) {
  const { t } = useTranslation();
  const effectiveNights = nights > 0 ? nights : 1;
  const totalPriceUsd = (result.bestRoom.priceUsd ?? result.bestRoom.basePriceUsd) * effectiveNights;
  const nightsLabel = t('search.card.nights', { count: nights || 1 });
  const topAmenities = result.amenities.slice(0, 3);

  return (
    <div className="bg-white rounded-xl shadow-sm flex overflow-hidden mb-4">
      <div className="w-44 flex-shrink-0">
        <img
          src={result.thumbnailUrl || 'https://placehold.co/176x140?text=Hotel'}
          alt={result.propertyName}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://placehold.co/176x140?text=Hotel';
          }}
        />
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide truncate">
            {result.propertyName}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {result.neighborhood ? `${result.neighborhood}, ` : ''}
            {result.city}, {result.country}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {resolveLabel(roomTypeLabels, result.bestRoom.roomType)} · {result.bestRoom.capacity}{' '}
            {t('search.card.guests', { count: result.bestRoom.capacity })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {topAmenities.map((a) => (
            <span
              key={a}
              className="border border-gray-300 rounded-md text-xs px-2 py-0.5 text-gray-600 whitespace-nowrap"
            >
              {resolveLabel(amenityLabels, a)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-end justify-between p-4 flex-shrink-0">
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">{formatCOP(totalPriceUsd)}</div>
          <div className="text-xs text-gray-500">{nightsLabel}</div>
        </div>
        <button
          onClick={onBook}
          className="flex items-center gap-2 bg-[#e8c84a] hover:bg-[#d4b53a] text-gray-900 font-semibold text-sm px-5 py-2 rounded-lg transition-colors mt-4"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <path d="M1 6h12" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M4 1v3M10 1v3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {t('search.card.book')}
        </button>
      </div>
    </div>
  );
}
