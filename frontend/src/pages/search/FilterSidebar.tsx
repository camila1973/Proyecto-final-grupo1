import { useTranslation } from 'react-i18next';
import type { FacetItem, LabelMap, SearchResponse } from './types';
import { resolveLabel } from './utils';

interface FilterSidebarProps {
  facets: SearchResponse['facets'] | null;
  amenityLabels: LabelMap;
  roomTypeLabels: LabelMap;
  amenityCategoryLabel: string;
  roomTypeCategoryLabel: string;
  priceMinCOP: string;
  priceMaxCOP: string;
  selectedAmenities: string[];
  selectedRoomTypes: string[];
  hasActiveFilters: boolean;
  onPriceMinChange: (val: string) => void;
  onPriceMaxChange: (val: string) => void;
  onToggleAmenity: (id: string) => void;
  onToggleRoomType: (id: string) => void;
  onClearFilters: () => void;
}

export default function FilterSidebar({
  facets,
  amenityLabels,
  roomTypeLabels,
  amenityCategoryLabel,
  roomTypeCategoryLabel,
  priceMinCOP,
  priceMaxCOP,
  selectedAmenities,
  selectedRoomTypes,
  hasActiveFilters,
  onPriceMinChange,
  onPriceMaxChange,
  onToggleAmenity,
  onToggleRoomType,
  onClearFilters,
}: FilterSidebarProps) {
  const { t } = useTranslation();
  return (
    <aside className="w-64 flex-shrink-0">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">{t('search.filters.title')}</h2>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-[#4a6fa5] flex items-center gap-1 hover:text-[#3a5a8a] transition-colors"
          >
            <span aria-hidden="true">×</span> {t('search.filters.clear')}
          </button>
        )}
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">
          {t('search.filters.price_label')}
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">
              {t('search.filters.price_from')}
            </label>
            <input
              type="number"
              value={priceMinCOP}
              onChange={(e) => onPriceMinChange(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">
              {t('search.filters.price_to')}
            </label>
            <input
              type="number"
              value={priceMaxCOP}
              onChange={(e) => onPriceMaxChange(e.target.value)}
              placeholder="—"
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Amenities */}
      {facets?.amenities && facets.amenities.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">
            {amenityCategoryLabel.toUpperCase()}
          </p>
          <div className="space-y-2">
            {facets.amenities.map((item: FacetItem) => (
              <label
                key={String(item.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(String(item.id))}
                    onChange={() => onToggleAmenity(String(item.id))}
                    className="w-4 h-4 rounded border-gray-300 accent-[#4a6fa5]"
                  />
                  <span className="text-sm text-gray-700">
                    {resolveLabel(amenityLabels, String(item.id))}
                  </span>
                </div>
                <span className="text-xs text-gray-400 ml-2">{item.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Room Types */}
      {facets?.roomTypes && facets.roomTypes.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">
            {roomTypeCategoryLabel.toUpperCase()}
          </p>
          <div className="space-y-2">
            {facets.roomTypes.map((item: FacetItem) => (
              <label
                key={String(item.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRoomTypes.includes(String(item.id))}
                    onChange={() => onToggleRoomType(String(item.id))}
                    className="w-4 h-4 rounded border-gray-300 accent-[#4a6fa5]"
                  />
                  <span className="text-sm text-gray-700">
                    {resolveLabel(roomTypeLabels, String(item.id))}
                  </span>
                </div>
                <span className="text-xs text-gray-400 ml-2">{item.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
