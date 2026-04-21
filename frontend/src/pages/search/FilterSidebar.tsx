import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../context/LocaleContext';
import type { FacetItem, LabelMap, SearchResponse } from './types';
import { filterReducer } from './filterReducer';
import type { FilterState, FilterAction } from './filterReducer';
import { resolveLabel, formatPrice } from './utils';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface FilterSidebarProps {
  facets: SearchResponse['facets'] | null;
  committedFilters: FilterState;
  amenityLabels: LabelMap;
  roomTypeLabels: LabelMap;
  bedTypeLabels: LabelMap;
  viewTypeLabels: LabelMap;
  amenityCategoryLabel: string;
  roomTypeCategoryLabel: string;
  bedTypeCategoryLabel: string;
  viewTypeCategoryLabel: string;
  onFiltersChange: (filters: FilterState) => void;
}

export default function FilterSidebar({
  facets,
  committedFilters,
  amenityLabels,
  roomTypeLabels,
  bedTypeLabels,
  viewTypeLabels,
  amenityCategoryLabel,
  roomTypeCategoryLabel,
  bedTypeCategoryLabel,
  viewTypeCategoryLabel,
  onFiltersChange,
}: FilterSidebarProps) {
  const { t } = useTranslation();
  const { currency } = useLocale();

  const priceFloor = facets?.priceRange?.min ?? 0;
  const priceCeil = facets?.priceRange?.max ?? 10000;

  // null = not dragging; while dragging we show the draft, on commit we clear it
  const [draftValue, setDraftValue] = useState<[number, number] | null>(null);

  const committedValue: [number, number] = [
    committedFilters.priceMin ? Number(committedFilters.priceMin) : priceFloor,
    committedFilters.priceMax ? Number(committedFilters.priceMax) : priceCeil,
  ];
  const sliderValue = draftValue ?? committedValue;

  function apply(action: FilterAction) {
    onFiltersChange(filterReducer(committedFilters, action));
  }

  const hasActiveFilters =
    !!committedFilters.priceMin ||
    !!committedFilters.priceMax ||
    committedFilters.amenities.length > 0 ||
    committedFilters.roomTypes.length > 0 ||
    committedFilters.bedTypes.length > 0 ||
    committedFilters.viewTypes.length > 0 ||
    committedFilters.stars.length > 0;

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">{t('search.filters.title')}</h2>
        {hasActiveFilters && (
          <Button
            onClick={() => apply({ type: 'CLEAR' })}
            size="small"
            color="primary"
            sx={{ textTransform: 'none', fontSize: '0.875rem', minWidth: 0, p: 0 }}
          >
            {t('search.filters.clear')}
          </Button>
        )}
      </div>

      {/* Price Range */}
      {facets?.priceRange && priceFloor < priceCeil && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">
            {t('search.filters.price_label', { currency })}
          </p>
          <Slider
            value={sliderValue}
            min={priceFloor}
            max={priceCeil}
            onChange={(_, newValue) => setDraftValue(newValue as [number, number])}
            onChangeCommitted={(_, newValue) => {
              const [min, max] = newValue as [number, number];
              setDraftValue(null);
              apply({
                type: 'SET_PRICE_RANGE',
                priceMin: min === priceFloor ? '' : String(min),
                priceMax: max === priceCeil ? '' : String(max),
              });
            }}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => formatPrice(v, currency)}
            getAriaLabel={(i) => (i === 0 ? 'price-min' : 'price-max')}
            size="small"
            sx={{ color: 'primary.main' }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              {formatPrice(sliderValue[0], currency)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatPrice(sliderValue[1], currency)}
            </Typography>
          </Box>
        </div>
      )}

      {/* Stars */}
      {facets?.stars && facets.stars.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">
            {t('search.filters.stars_label')}
          </p>
          <div className="space-y-1">
            {facets.stars.map((item: FacetItem) => (
              <div key={String(item.id)} className="flex items-center justify-between">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={committedFilters.stars.includes(Number(item.id))}
                      onChange={() => apply({ type: 'TOGGLE_STAR', star: Number(item.id) })}
                      size="small"
                      color="primary"
                    />
                  }
                  label={
                    <span className="text-sm text-gray-700">
                      {'★'.repeat(Number(item.id))}
                    </span>
                  }
                  sx={{ m: 0 }}
                />
                <span className="text-xs text-gray-400 ml-2">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                      checked={committedFilters.amenities.includes(String(item.id))}
                      onChange={() => apply({ type: 'TOGGLE_ITEM', field: 'amenities', id: String(item.id) })}
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
                      checked={committedFilters.roomTypes.includes(String(item.id))}
                      onChange={() => apply({ type: 'TOGGLE_ITEM', field: 'roomTypes', id: String(item.id) })}
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

      {/* Bed Types */}
      {facets?.bedTypes && facets.bedTypes.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">
            {bedTypeCategoryLabel.toUpperCase()}
          </p>
          <div className="space-y-1">
            {facets.bedTypes.map((item: FacetItem) => (
              <div key={String(item.id)} className="flex items-center justify-between">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={committedFilters.bedTypes.includes(String(item.id))}
                      onChange={() => apply({ type: 'TOGGLE_ITEM', field: 'bedTypes', id: String(item.id) })}
                      size="small"
                      color="primary"
                    />
                  }
                  label={<span className="text-sm text-gray-700">{resolveLabel(bedTypeLabels, String(item.id))}</span>}
                  sx={{ m: 0 }}
                />
                <span className="text-xs text-gray-400 ml-2">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Types */}
      {facets?.viewTypes && facets.viewTypes.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">
            {viewTypeCategoryLabel.toUpperCase()}
          </p>
          <div className="space-y-1">
            {facets.viewTypes.map((item: FacetItem) => (
              <div key={String(item.id)} className="flex items-center justify-between">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={committedFilters.viewTypes.includes(String(item.id))}
                      onChange={() => apply({ type: 'TOGGLE_ITEM', field: 'viewTypes', id: String(item.id) })}
                      size="small"
                      color="primary"
                    />
                  }
                  label={<span className="text-sm text-gray-700">{resolveLabel(viewTypeLabels, String(item.id))}</span>}
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
