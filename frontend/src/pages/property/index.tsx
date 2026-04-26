import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useBookingFlow } from '../../hooks/useBookingFlow';
import { useLocale } from '../../context/LocaleContext';
import { formatAddress } from '../../utils/address';
import { fetchPropertyRooms, type PropertyRoomsResponse } from '../../utils/queries';
import dayjs, { type Dayjs } from 'dayjs';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Chip from '@mui/material/Chip';
import SearchBarForm from '../../components/SearchBarForm';
import RoomList from './RoomList';
import PropertyImageCarousel from './PropertyImageCarousel';
import PropertyReviewsSection from './PropertyReviewsSection';
import LabeledField from '../../components/LabeledField';
import GuestSelector from '../../components/GuestSelector';
import ArrowBackIosNew from '@mui/icons-material/ArrowBackIosNew';

const DESCRIPTION_PREVIEW_CHARS = 260;

export default function PropertyDetailPage() {
  const { t, i18n } = useTranslation();
  const { currency, language } = useLocale();
  const { propertyId } = useParams({ from: '/properties/$propertyId' });
  const { checkIn: qCheckIn, checkOut: qCheckOut, guests: qGuests } = useSearch({ from: '/properties/$propertyId' });
  const initCheckIn = qCheckIn ? dayjs(qCheckIn) : dayjs();
  const initCheckOut = qCheckOut ? dayjs(qCheckOut) : dayjs().add(8, 'day');
  const initGuests = qGuests > 0 ? qGuests : 1;

  // Draft state — controlled by sidebar inputs, not committed until search is clicked
  const [draftCheckIn, setDraftCheckIn] = useState<Dayjs | null>(initCheckIn);
  const [draftCheckOut, setDraftCheckOut] = useState<Dayjs | null>(initCheckOut);
  const [draftAdults, setDraftAdults] = useState(initGuests);
  const [draftChildren, setDraftChildren] = useState(0);

  // Committed state — drives the query
  const [checkIn, setCheckIn] = useState<Dayjs | null>(initCheckIn);
  const [checkOut, setCheckOut] = useState<Dayjs | null>(initCheckOut);
  const [guests, setGuests] = useState(initGuests);

  const [descExpanded, setDescExpanded] = useState(false);
  const { book } = useBookingFlow();

  const fromDate = checkIn?.format('YYYY-MM-DD');
  const toDate = checkOut?.format('YYYY-MM-DD');
  const nights = checkOut && checkIn ? Math.max(1, checkOut.diff(checkIn, 'day')) : 1;

  function applySearch() {
    setCheckIn(draftCheckIn);
    setCheckOut(draftCheckOut);
    setGuests(draftAdults + draftChildren);
  }

  const { data, isPending, isError, isFetching } = useQuery<PropertyRoomsResponse>({
    queryKey: ['property-rooms', propertyId, fromDate, toDate, guests, language],
    queryFn: () => fetchPropertyRooms(propertyId, fromDate, toDate, guests, language),
    placeholderData: keepPreviousData,
  });

  if (isPending && !data) {
    return (
      <main className="max-w-[1152px] mx-auto w-full px-6 py-8 flex-1">
        <p className="text-gray-500">{t('property_detail.loading')}</p>
      </main>
    );
  }

  if (isError || !data?.property) {
    return (
      <main className="max-w-[1152px] mx-auto w-full px-6 py-8 flex-1">
        <p className="text-red-500">{t('property_detail.error')}</p>
      </main>
    );
  }

  const { property, rooms } = data;
  const address = formatAddress(property.neighborhood, property.city, property.countryCode);

  // Prefer server-localized description; fall back to the language map sent
  // alongside it, otherwise to the legacy template-based copy.
  const description =
    property.description && property.description.length > 0
      ? property.description
      : (property.descriptionByLang?.[i18n.language] ??
          property.descriptionByLang?.['es'] ??
          t('property_detail.about_description', { name: property.name, address }));

  const needsTruncate = description.length > DESCRIPTION_PREVIEW_CHARS;
  const descriptionPreview = needsTruncate && !descExpanded
    ? description.slice(0, DESCRIPTION_PREVIEW_CHARS).trimEnd() + '…'
    : description;

  const carouselImages =
    property.imageUrls && property.imageUrls.length > 0
      ? property.imageUrls
      : property.thumbnailUrl
        ? [property.thumbnailUrl]
        : [];

  return (
    <>
      {/* Hero — same SearchBarForm as SearchPage */}
      <section className="bg-[#4a6fa5] py-8 px-6">
        <div className="max-w-[1152px] mx-auto">
          <SearchBarForm
            defaultCity={property.city}
            defaultCountryCode={property.countryCode}
            defaultCheckIn={qCheckIn}
            defaultCheckOut={qCheckOut}
            defaultGuests={qGuests > 0 ? qGuests : 2}
          />
        </div>
      </section>

      {/* Main content */}
      <main className="max-w-[1152px] mx-auto w-full px-6 py-8 flex-1">
        {/* Back button */}
        <Button
          startIcon={<ArrowBackIosNew />}
          onClick={() => history.back()}
          sx={{ color: 'text.secondary', fontWeight: 500, mb: 3 }}
        >
        {t('property_detail.back')}
        </Button>

        {/* Image carousel — async loaded from CDN */}
        <div className="mb-12">
          <PropertyImageCarousel images={carouselImages} alt={property.name} />
        </div>

        {/* Property header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-12">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 uppercase mb-1">{property.name}</h1>
            <p className="text-gray-500 text-sm">{address}</p>
            {/* Silent availability indicator — rechecks against the PMS gateway
                whenever the user changes dates or guests. */}
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
              {isFetching ? (
                <>
                  <SyncIcon fontSize="inherit" className="animate-spin" />
                  <span>{t('property_detail.availability')}</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon fontSize="inherit" sx={{ color: '#16a34a' }} />
                  <span>{t('property_detail.available')}</span>
                </>
              )}
            </div>
          </div>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon fontSize="small" />}
            sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {t('property_detail.book_now')}
          </Button>
        </div>

        {/* About */}
        <section className="mb-12">
          <h2 className="text-base font-bold text-gray-900 mb-2">{t('property_detail.about')}</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            {descriptionPreview}{' '}
            {needsTruncate && (
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="text-blue-600 font-semibold hover:underline"
              >
                {descExpanded ? t('property_detail.read_less') : t('property_detail.read_more')}
              </button>
            )}
          </p>
        </section>

        {/* Amenities */}
        {property.amenities.length > 0 && (
          <section className="mb-12">
            <h2 className="text-base font-bold text-gray-900 mb-3">{t('property_detail.amenities')}</h2>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity) => (
                <Chip
                  key={amenity}
                  label={t(`taxonomies.amenities.${amenity}`, { defaultValue: amenity })}
                  variant="outlined"
                  sx={{ borderRadius: 99 }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Rooms */}
        <section>
          <div className="flex gap-8">
            {/* Sidebar filters */}
            <div className="w-64 flex-shrink-0 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">{t('property_detail.rooms')}</h2>
              </div>
              {/* Check-in */}
              <LabeledField label={t('hero.check_in_label')} compact>
                <DatePicker
                  value={draftCheckIn}
                  onChange={(val) => {
                    setDraftCheckIn(val);
                    if (val && draftCheckOut && !draftCheckOut.isAfter(val)) {
                      setDraftCheckOut(val.add(1, 'day'));
                    }
                  }}
                  disablePast
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      sx: { '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } },
                    },
                  }}
                />
              </LabeledField>

              {/* Check-out */}
              <LabeledField label={t('hero.check_out_label')} compact>
                <DatePicker
                  value={draftCheckOut}
                  onChange={(val) => setDraftCheckOut(val)}
                  minDate={draftCheckIn?.add(1, 'day') ?? undefined}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      sx: { '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } },
                    },
                  }}
                />
              </LabeledField>

              {/* Guests */}
              <LabeledField label={t('property_detail.guests_label')} compact>
                <GuestSelector
                  adults={draftAdults}
                  children={draftChildren}
                  onChange={({ adults, children }) => {
                    setDraftAdults(adults);
                    setDraftChildren(children);
                  }}
                />
              </LabeledField>

              <Button
                fullWidth
                variant="contained"
                startIcon={<SearchIcon fontSize="small" />}
                onClick={applySearch}
              >
                {t('hero.search')}
              </Button>
            </div>

            {/* Room list */}
            <RoomList
              rooms={rooms}
              isFetching={isFetching}
              nights={nights}
              currency={currency}
              heroImg={carouselImages[0] ?? property.thumbnailUrl}
              propertyId={propertyId}
              propertyName={property.name}
              fromDate={fromDate ?? ''}
              toDate={toDate ?? ''}
              guests={guests}
              onBook={book}
            />
          </div>
        </section>

        {/* Reviews */}
        <PropertyReviewsSection
          propertyId={propertyId}
          fallbackAverage={property.rating}
          fallbackCount={property.reviewCount}
        />
      </main>
    </>
  );
}
