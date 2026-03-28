import { useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../context/LocaleContext';
import { API_BASE } from '../../env';
import SearchBarForm from '../../components/SearchBarForm';
import ResultCard from './ResultCard';
import FilterSidebar from './FilterSidebar';
import { CURRENCY_RATES, getNights, buildLabelMap, fetchTaxonomies } from './utils';
import type { SearchResponse, TaxonomyResponse, LabelMap } from './types';

export default function SearchPage() {
  const { t } = useTranslation();
  const { currency } = useLocale();
  const navigate = useNavigate();

  const {
    city: urlCity,
    checkIn: urlCheckIn,
    checkOut: urlCheckOut,
    guests: urlGuests,
  } = useSearch({ from: '/search' });

  // Taxonomy — cached 24h on the backend, preloaded for label resolution
  const { data: taxonomyData } = useQuery<TaxonomyResponse>({
    queryKey: ['taxonomies'],
    queryFn: fetchTaxonomies,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const amenityLabels: LabelMap = taxonomyData
    ? buildLabelMap(taxonomyData.categories, 'amenities')
    : {};
  const roomTypeLabels: LabelMap = taxonomyData
    ? buildLabelMap(taxonomyData.categories, 'room_type')
    : {};
  const amenityCategoryLabel =
    taxonomyData?.categories.find((c) => c.code === 'amenities')?.label ?? 'AMENIDADES';
  const roomTypeCategoryLabel =
    taxonomyData?.categories.find((c) => c.code === 'room_type')?.label ?? 'TIPO DE HABITACIÓN';

  // Filter state
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);

  // Build API query string from URL params + active filters
  const queryParams = new URLSearchParams();
  if (urlCity) queryParams.set('city', urlCity);
  if (urlCheckIn) queryParams.set('checkIn', urlCheckIn);
  if (urlCheckOut) queryParams.set('checkOut', urlCheckOut);
  if (urlGuests) queryParams.set('guests', String(urlGuests));
  const priceMinNum = priceMin ? Number(priceMin) / CURRENCY_RATES[currency] : null;
  const priceMaxNum = priceMax ? Number(priceMax) / CURRENCY_RATES[currency] : null;
  if (priceMinNum != null && !isNaN(priceMinNum)) queryParams.set('priceMin', String(priceMinNum));
  if (priceMaxNum != null && !isNaN(priceMaxNum)) queryParams.set('priceMax', String(priceMaxNum));
  if (selectedAmenities.length > 0) queryParams.set('amenities', selectedAmenities.join(','));
  if (selectedRoomTypes.length > 0) queryParams.set('roomType', selectedRoomTypes.join(','));
  if (selectedAmenities.length > 0 || selectedRoomTypes.length > 0) queryParams.set('exact', 'true');

  const { data, isLoading, isError } = useQuery<SearchResponse>({
    queryKey: [
      'search',
      urlCity,
      urlCheckIn,
      urlCheckOut,
      urlGuests,
      priceMin,
      priceMax,
      currency,
      selectedAmenities,
      selectedRoomTypes,
    ],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/search/properties?${queryParams}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
  });

  const nights = getNights(urlCheckIn, urlCheckOut);
  const results = data?.results ?? [];
  const total = data?.meta.total ?? 0;
  const facets = data?.facets ?? null;
  const hasActiveFilters =
    !!priceMin || !!priceMax || selectedAmenities.length > 0 || selectedRoomTypes.length > 0;

  function toggleAmenity(id: string) {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  function toggleRoomType(id: string) {
    setSelectedRoomTypes((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  function clearFilters() {
    setPriceMin('');
    setPriceMax('');
    setSelectedAmenities([]);
    setSelectedRoomTypes([]);
  }

  return (
    <>
      {/* Hero Search Bar — key resets form state when URL params change */}
      <section className="bg-[#4a6fa5] py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <SearchBarForm
            key={`${urlCity}-${urlCheckIn}-${urlCheckOut}-${urlGuests}`}
            defaultCity={urlCity}
            defaultCheckIn={urlCheckIn}
            defaultCheckOut={urlCheckOut}
            defaultGuests={urlGuests}
          />
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-6 py-8 flex gap-8 flex-1">
        <FilterSidebar
          facets={facets}
          amenityLabels={amenityLabels}
          roomTypeLabels={roomTypeLabels}
          amenityCategoryLabel={amenityCategoryLabel}
          roomTypeCategoryLabel={roomTypeCategoryLabel}
          priceMin={priceMin}
          priceMax={priceMax}
          selectedAmenities={selectedAmenities}
          selectedRoomTypes={selectedRoomTypes}
          hasActiveFilters={hasActiveFilters}
          onPriceMinChange={setPriceMin}
          onPriceMaxChange={setPriceMax}
          onToggleAmenity={toggleAmenity}
          onToggleRoomType={toggleRoomType}
          onClearFilters={clearFilters}
        />

        {/* Results Panel */}
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            {!isLoading && !isError && (
              <p className="text-sm text-gray-700">
                <span className="font-bold">{t('search.results_count', { count: total })}</span>
                {urlCity ? ` ${t('search.results_city', { city: urlCity })}` : ''}
              </p>
            )}
          </div>

          {isLoading && (
            <div className="text-center py-16 text-gray-500 text-sm">{t('search.loading')}</div>
          )}

          {isError && (
            <div className="text-center py-16 text-red-500 text-sm">{t('search.error')}</div>
          )}

          {!isLoading && !isError && results.length === 0 && (
            <div className="text-center py-16 text-gray-500 text-sm">{t('search.empty')}</div>
          )}

          {results.map((result) => (
            <ResultCard
              key={result.propertyId}
              result={result}
              nights={nights}
              amenityLabels={amenityLabels}
              roomTypeLabels={roomTypeLabels}
              onBook={() =>
                navigate({
                  to: '/properties/$propertyId',
                  params: { propertyId: result.propertyId },
                })
              }
            />
          ))}
        </div>
      </main>
    </>
  );
}
