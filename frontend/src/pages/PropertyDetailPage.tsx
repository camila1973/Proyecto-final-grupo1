import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../context/LocaleContext';
import { formatPrice } from '../utils/currency';
import { formatAddress } from '../utils/address';
import { API_BASE } from '../env';
import dayjs, { type Dayjs } from 'dayjs';
import Button from '@mui/material/Button';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SyncIcon from '@mui/icons-material/Sync';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import HorizontalCard from '../components/HorizontalCard';
import SearchBarForm from '../components/SearchBarForm';
import PropertyImageCarousel from '../components/PropertyImageCarousel';
import PropertyReviewsSection from '../components/PropertyReviewsSection';

interface SearchRoom {
  roomId: string;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  basePriceUsd: number;
  priceUsd: number | null;
  taxRatePct: number;
  partnerId: string;
  estimatedTotalUsd: number;
  hasFlatFees: boolean;
}

interface PropertyInfo {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  neighborhood: string | null;
  stars: number;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  imageUrls?: string[];
  description?: string;
  descriptionByLang?: Record<string, string>;
  amenities: string[];
}

interface PropertyRoomsResponse {
  property: PropertyInfo | null;
  rooms: SearchRoom[];
}

async function fetchPropertyRooms(
  propertyId: string,
  checkIn?: string,
  checkOut?: string,
  guests?: number,
  lang?: string,
): Promise<PropertyRoomsResponse> {
  const params = new URLSearchParams();
  if (checkIn) params.set('checkIn', checkIn);
  if (checkOut) params.set('checkOut', checkOut);
  if (guests) params.set('guests', String(guests));
  if (lang) params.set('lang', lang);
  const qs = params.toString();
  const res = await fetch(
    `${API_BASE}/api/search/properties/${propertyId}/rooms${qs ? `?${qs}` : ''}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch rooms for property ${propertyId}`);
  return res.json() as Promise<PropertyRoomsResponse>;
}

const DESCRIPTION_PREVIEW_CHARS = 260;

export default function PropertyDetailPage() {
  const { t, i18n } = useTranslation();
  const { currency, language } = useLocale();
  const { propertyId } = useParams({ from: '/properties/$propertyId' });
  const { checkIn: qCheckIn, checkOut: qCheckOut, guests: qGuests } = useSearch({ from: '/properties/$propertyId' });
  const [checkIn, setCheckIn] = useState<Dayjs | null>(qCheckIn ? dayjs(qCheckIn) : dayjs());
  const [checkOut, setCheckOut] = useState<Dayjs | null>(qCheckOut ? dayjs(qCheckOut) : dayjs().add(8, 'day'));
  const [guests, setGuests] = useState<number>(qGuests > 0 ? qGuests : 1);
  const [descExpanded, setDescExpanded] = useState(false);

  const fromDate = checkIn?.format('YYYY-MM-DD');
  const toDate = checkOut?.format('YYYY-MM-DD');
  const nights = checkOut && checkIn ? Math.max(1, checkOut.diff(checkIn, 'day')) : 1;

  const { data, isPending, isError, isFetching } = useQuery<PropertyRoomsResponse>({
    queryKey: ['property-rooms', propertyId, fromDate, toDate, guests, language],
    queryFn: () => fetchPropertyRooms(propertyId, fromDate, toDate, guests, language),
  });

  if (isPending) {
    return (
      <main className="max-w-6xl mx-auto w-full px-6 py-8 flex-1">
        <p className="text-gray-500">{t('property_detail.loading')}</p>
      </main>
    );
  }

  if (isError || !data?.property) {
    return (
      <main className="max-w-6xl mx-auto w-full px-6 py-8 flex-1">
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
        <div className="max-w-6xl mx-auto">
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
      <main className="max-w-6xl mx-auto w-full px-6 py-8 flex-1">
        {/* Back button */}
        <Button
          onClick={() => history.back()}
          color="primary"
          startIcon={
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          sx={{ textTransform: 'none', fontWeight: 500, mb: 3 }}
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
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                  {t('hero.check_in_label')}
                </p>
                <DatePicker
                  value={checkIn}
                  onChange={(val) => {
                    setCheckIn(val);
                    if (val && checkOut && !checkOut.isAfter(val)) {
                      setCheckOut(val.add(1, 'day'));
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
              </div>

              {/* Check-out */}
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                  {t('hero.check_out_label')}
                </p>
                <DatePicker
                  value={checkOut}
                  onChange={(val) => setCheckOut(val)}
                  minDate={checkIn?.add(1, 'day') ?? undefined}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      sx: { '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } },
                    },
                  }}
                />
              </div>

              {/* Guests */}
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                  {t('property_detail.guests_label').toUpperCase()}
                </p>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  value={guests}
                  onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
                  inputProps={{ min: 1 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } }}
                />
              </div>
            </div>

            {/* Room list */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="mb-6">
                <p className="text-sm text-gray-700 text-right">
                  <span className="font-bold">{t('property_detail.rooms_count', { count: rooms.length })}</span>
                  {` ${t('property_detail.rooms_available')}`}
                </p>
              </div>

              {rooms.length === 0 ? (
                <p className="text-sm italic text-gray-500">{t('property_detail.no_rooms')}</p>
              ) : (
                rooms.map((room) => {
                  const pricePerNight = room.priceUsd ?? room.basePriceUsd;
                  const roomLabel = t(`taxonomies.room_type.${room.roomType}`, { defaultValue: room.roomType });
                  const bedLabel = t(`taxonomies.bed_type.${room.bedType}`, { defaultValue: room.bedType });
                  const heroImg = carouselImages[0] ?? property.thumbnailUrl;

                  return (
                    <HorizontalCard
                      key={room.roomId}
                      imageUrl={heroImg}
                      imageAlt={roomLabel}
                      bgcolor="grey.50"
                      sx={{ mb: 2 }}
                      middleContent={
                        <>
                          <Box>
                            <Typography
                              variant="subtitle1"
                              fontWeight={600}
                              textTransform="uppercase"
                              noWrap
                              color="text.primary"
                            >
                              {roomLabel}
                            </Typography>
                            <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5, listStyleType: 'disc' }}>
                              <Typography component="li" variant="caption" color="text.secondary">
                                {t('property_detail.capacity_for', { count: room.capacity })}
                              </Typography>
                              <Typography component="li" variant="caption" color="text.secondary">
                                {t('property_detail.has_bed', { bed: bedLabel })}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="body2" fontWeight={700}>
                            {formatPrice(pricePerNight, currency)}{' '}
                            <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
                              {t('property_detail.per_night')}
                            </Typography>
                          </Typography>
                        </>
                      }
                      rightPanel={
                        <>
                          <Box textAlign="right">
                            <Typography variant="h6" fontWeight={700} lineHeight={1.2} color="text.primary">
                              {formatPrice(room.estimatedTotalUsd, currency)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {t('property_detail.nights_incl_taxes', { count: nights })}
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            color="warning"
                            startIcon={<BookmarkIcon fontSize="small" />}
                            sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', borderRadius: 1 }}
                          >
                            {t('property_detail.book_now')}
                          </Button>
                        </>
                      }
                    />
                  );
                })
              )}
            </div>
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
