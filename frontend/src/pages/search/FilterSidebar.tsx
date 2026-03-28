import { useTranslation } from 'react-i18next';
import { useLocale } from '../../context/LocaleContext';
import type { FacetItem, LabelMap, SearchResponse } from './types';
import { resolveLabel } from './utils';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';

interface FilterSidebarProps {
  facets: SearchResponse['facets'] | null;
  amenityLabels: LabelMap;
  roomTypeLabels: LabelMap;
  amenityCategoryLabel: string;
  roomTypeCategoryLabel: string;
  priceMin: string;
  priceMax: string;
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
  priceMin,
  priceMax,
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
  const { currency } = useLocale();
  return (
    <aside className="w-64 flex-shrink-0">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">{t('search.filters.title')}</h2>
        {hasActiveFilters && (
          <Button
            onClick={onClearFilters}
            size="small"
            color="primary"
            sx={{ textTransform: 'none', fontSize: '0.875rem', minWidth: 0, p: 0 }}
          >
            {t('search.filters.clear')}
          </Button>
        )}
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">
          {t('search.filters.price_label', { currency })}
        </p>
        <div className="flex gap-3">
          <TextField
            type="number"
            label={t('search.filters.price_from')}
            value={priceMin}
            onChange={(e) => onPriceMinChange(e.target.value)}
            placeholder="0"
            size="small"
            variant="outlined"
            slotProps={{ inputLabel: { shrink: true } }}
            className="flex-1"
          />
          <TextField
            type="number"
            label={t('search.filters.price_to')}
            value={priceMax}
            onChange={(e) => onPriceMaxChange(e.target.value)}
            placeholder="—"
            size="small"
            variant="outlined"
            slotProps={{ inputLabel: { shrink: true } }}
            className="flex-1"
          />
        </div>
      </div>

      {/* Amenities */}
      {facets?.amenities && facets.amenities.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">
            {amenityCategoryLabel.toUpperCase()}
          </p>
          <div className="space-y-1">
            {facets.amenities.map((item: FacetItem) => (
              <div key={String(item.id)} className="flex items-center justify-between">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedAmenities.includes(String(item.id))}
                      onChange={() => onToggleAmenity(String(item.id))}
                      size="small"
                      color="primary"
                    />
                  }
                  label={<span className="text-sm text-gray-700">{resolveLabel(amenityLabels, String(item.id))}</span>}
                  sx={{ m: 0 }}
                />
                <span className="text-xs text-gray-400 ml-2">{item.count}</span>
              </div>
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
          <div className="space-y-1">
            {facets.roomTypes.map((item: FacetItem) => (
              <div key={String(item.id)} className="flex items-center justify-between">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedRoomTypes.includes(String(item.id))}
                      onChange={() => onToggleRoomType(String(item.id))}
                      size="small"
                      color="primary"
                    />
                  }
                  label={<span className="text-sm text-gray-700">{resolveLabel(roomTypeLabels, String(item.id))}</span>}
                  sx={{ m: 0 }}
                />
                <span className="text-xs text-gray-400 ml-2">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
