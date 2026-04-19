import { useSearch, useNavigate } from '@tanstack/react-router';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../context/LocaleContext';
import { API_BASE } from '../../env';
import SearchBarForm from '../../components/SearchBarForm';
import ResultCard from './ResultCard';
import FilterSidebar from './FilterSidebar';
import { getNights, buildLabelMap, fetchTaxonomies } from './utils';
import type { FilterState } from './filterReducer';
import type { SearchResponse, TaxonomyResponse, LabelMap } from './types';

export default function SearchPage() {
  const { t } = useTranslation();
  const { currency } = useLocale();
  const navigate = useNavigate();

  const {
    city: urlCity,
    countryCode: urlCountryCode,
    checkIn: urlCheckIn,
    checkOut: urlCheckOut,
    guests: urlGuests,
    priceMin: urlPriceMin,
    priceMax: urlPriceMax,
    amenities: urlAmenities,
    roomTypes: urlRoomTypes,
    bedTypes: urlBedTypes,
    viewTypes: urlViewTypes,
    stars: urlStars,
  } = useSearch({ from: '/search' });

  // Taxonomy — cached 24h on the backend, preloaded for label resolution
  const { data: taxonomyData } = useQuery<TaxonomyResponse>({
    queryKey: ['taxonomies'],
    queryFn: fetchTaxonomies,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const amenityLabels: LabelMap = taxonomyData
    ? buildLabelMap(taxonomyData.categories, 'amenities', t)
    : {};
  const roomTypeLabels: LabelMap = taxonomyData
    ? buildLabelMap(taxonomyData.categories, 'room_type', t)
    : {};
  const bedTypeLabels: LabelMap = taxonomyData
    ? buildLabelMap(taxonomyData.categories, 'bed_type', t)
    : {};
  const viewTypeLabels: LabelMap = taxonomyData
    ? buildLabelMap(taxonomyData.categories, 'view_type', t)
    : {};
  const amenityCategoryLabel = t('taxonomies.categories.amenities');
  const roomTypeCategoryLabel = t('taxonomies.categories.room_type');
  const bedTypeCategoryLabel = t('taxonomies.categories.bed_type');
  const viewTypeCategoryLabel = t('taxonomies.categories.view_type');

  // Filter state derived from URL params
  const filters: FilterState = {
    priceMin: urlPriceMin ?? '',
    priceMax: urlPriceMax ?? '',
    amenities: urlAmenities ? urlAmenities.split(',') : [],
    roomTypes: urlRoomTypes ? urlRoomTypes.split(',') : [],
    bedTypes: urlBedTypes ? urlBedTypes.split(',') : [],
    viewTypes: urlViewTypes ? urlViewTypes.split(',') : [],
    stars: urlStars ? urlStars.split(',').map(Number) : [],
  };

  function handleFiltersChange(f: FilterState) {
    navigate({
      to: '/search',
      search: {
        city: urlCity,
        countryCode: urlCountryCode,
        checkIn: urlCheckIn,
        checkOut: urlCheckOut,
        guests: urlGuests,
        priceMin: f.priceMin || undefined,
        priceMax: f.priceMax || undefined,
        amenities: f.amenities.length ? f.amenities.join(',') : undefined,
        roomTypes: f.roomTypes.length ? f.roomTypes.join(',') : undefined,
        bedTypes: f.bedTypes.length ? f.bedTypes.join(',') : undefined,
        viewTypes: f.viewTypes.length ? f.viewTypes.join(',') : undefined,
        stars: f.stars.length ? f.stars.join(',') : undefined,
      },
    });
  }

  // Build API query string from URL params + active filters
  const queryParams = new URLSearchParams();
  if (urlCity) queryParams.set('city', urlCity);
  if (urlCountryCode) queryParams.set('countryCode', urlCountryCode);
  if (urlCheckIn) queryParams.set('checkIn', urlCheckIn);
  if (urlCheckOut) queryParams.set('checkOut', urlCheckOut);
  if (urlGuests) queryParams.set('guests', String(urlGuests));
  const priceMinNum = filters.priceMin ? Number(filters.priceMin) : null;
  const priceMaxNum = filters.priceMax ? Number(filters.priceMax) : null;
  if (priceMinNum != null && !isNaN(priceMinNum)) queryParams.set('priceMin', String(priceMinNum));
  if (priceMaxNum != null && !isNaN(priceMaxNum)) queryParams.set('priceMax', String(priceMaxNum));
  if (filters.amenities.length > 0) queryParams.set('amenities', filters.amenities.join(','));
  if (filters.roomTypes.length > 0) queryParams.set('roomType', filters.roomTypes.join(','));
  if (filters.bedTypes.length > 0) queryParams.set('bedType', filters.bedTypes.join(','));
  if (filters.viewTypes.length > 0) queryParams.set('viewType', filters.viewTypes.join(','));
  if (filters.stars.length > 0) queryParams.set('stars', filters.stars.join(','));
  if (
    filters.amenities.length > 0 ||
    filters.roomTypes.length > 0 ||
    filters.bedTypes.length > 0 ||
    filters.viewTypes.length > 0
  )
    queryParams.set('exact', 'true');

  const { data, isError, isFetching } = useQuery<SearchResponse>({
    queryKey: ['search', urlCity, urlCheckIn, urlCheckOut, urlGuests, currency, filters],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/search/properties?${queryParams}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const nights = getNights(urlCheckIn, urlCheckOut);
  const results = data?.results ?? [];
  const total = data?.meta.total ?? 0;
  const facets = data?.facets ?? null;
  return (
    <>
      {/* Hero Search Bar — key resets form state when URL params change */}
      <section className="bg-[#4a6fa5] py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <SearchBarForm
            key={`${urlCity}-${urlCheckIn}-${urlCheckOut}-${urlGuests}`}
            defaultCity={urlCity}
            defaultCountryCode={urlCountryCode}
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
          committedFilters={filters}
          amenityLabels={amenityLabels}
          roomTypeLabels={roomTypeLabels}
          bedTypeLabels={bedTypeLabels}
          viewTypeLabels={viewTypeLabels}
          amenityCategoryLabel={amenityCategoryLabel}
          roomTypeCategoryLabel={roomTypeCategoryLabel}
          bedTypeCategoryLabel={bedTypeCategoryLabel}
          viewTypeCategoryLabel={viewTypeCategoryLabel}
          onFiltersChange={handleFiltersChange}
        />

        {/* Results Panel */}
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            {!isError && results.length > 0 && (
              <p className="text-sm text-gray-700">
                <span className="font-bold">{t('search.results_count', { count: total })}</span>
                {urlCity ? ` ${t('search.results_city', { city: urlCity })}` : ''}
              </p>
            )}
          </div>

          {/* Initial load — no previous data yet */}
          {isFetching && results.length === 0 && (
            <div className="text-center py-16 text-gray-500 text-sm">{t('search.loading')}</div>
          )}

          {isError && (
            <div className="text-center py-16 text-red-500 text-sm">{t('search.error')}</div>
          )}

          {!isFetching && !isError && results.length === 0 && (
            <div className="text-center py-16 text-gray-500 text-sm">{t('search.empty')}</div>
          )}

          {/* Dim results in place during refetch — no layout shift */}
          <div className={isFetching ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
            {results.map((result) => (
              <ResultCard
                key={result.roomId}
                result={result}
                nights={nights}
                amenityLabels={amenityLabels}
                roomTypeLabels={roomTypeLabels}
                onBook={() =>
                  navigate({
                    to: '/properties/$propertyId',
                    params: { propertyId: result.property.id },
                    search: {
                      checkIn: urlCheckIn,
                      checkOut: urlCheckOut,
                      guests: urlGuests,
                    },
                  })
                }
              />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
