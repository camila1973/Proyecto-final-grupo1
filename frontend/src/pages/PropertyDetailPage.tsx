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
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
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
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <p className="text-gray-500">{t('property_detail.loading')}</p>
      </main>
    );
  }

  if (isError || !data?.property) {
    return (
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <p className="text-red-500">{t('property_detail.error')}</p>
      </main>
    );
  }

  const { property, rooms } = data;
  const address = formatAddress(property.neighborhood, property.city, property.countryCode);

  // Prefer server-localized description; if absent, resolve via client-side map.
  const description =
    property.description && property.description.length > 0
      ? property.description
      : (property.descriptionByLang?.[i18n.language] ??
          property.descriptionByLang?.['es'] ??
          '');

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
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
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
      <div className="mb-6">
        <PropertyImageCarousel images={carouselImages} alt={property.name} />
      </div>

      {/* Property header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
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
          {t('property_detail.select_room')}
        </Button>
      </div>

      {/* About */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-2">{t('property_detail.about')}</h2>
        {description ? (
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
        ) : (
          <p className="text-gray-400 text-sm italic">
            {t('property_detail.no_description')}
          </p>
        )}
      </section>

      {/* Amenities */}
      {property.amenities.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">{t('property_detail.amenities')}</h2>
          <div className="flex flex-wrap gap-2">
            {property.amenities.map((amenity) => (
              <Chip
                key={amenity}
                label={AMENITY_LABELS[amenity] ?? amenity}
                variant="outlined"
                sx={{ borderRadius: 99 }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Rooms */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{t('property_detail.rooms')}</h2>
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">
              {t('property_detail.rooms_found', { count: rooms.length })}
            </span>
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar filters */}
          <div className="md:w-56 shrink-0 flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('property_detail.check_in')}
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
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('property_detail.check_out')}
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
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('property_detail.guests')}
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
          <div className="flex-1 flex flex-col gap-4">
            {rooms.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                {t('property_detail.no_rooms')}
              </p>
            ) : (
              rooms.map((room) => {
                const pricePerNight = room.priceUsd ?? room.basePriceUsd;
                const roomLabel = ROOM_TYPE_LABELS[room.roomType] ?? room.roomType;
                const bedLabel = BED_TYPE_LABELS[room.bedType] ?? room.bedType;
                const heroImg = carouselImages[0] ?? property.thumbnailUrl;

                return (
                  <Card key={room.roomId} variant="outlined" sx={{ display: 'flex', borderRadius: 3, overflow: 'hidden', bgcolor: 'grey.50' }}>
                    <CardMedia
                      component="img"
                      image={heroImg}
                      alt={roomLabel}
                      loading="lazy"
                      sx={{ width: 220, flexShrink: 0, objectFit: 'cover', alignSelf: 'stretch' }}
                    />
                    <CardContent
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        py: 3,
                        px: 3,
                        '&:last-child': { pb: 3 },
                      }}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={700} textTransform="uppercase" gutterBottom>
                          {roomLabel}
                        </Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography component="li" variant="body2" color="text.secondary">
                            {t('property_detail.room_capacity', { count: room.capacity })}
                          </Typography>
                          <Typography component="li" variant="body2" color="text.secondary">
                            {t('property_detail.room_bed', { bed: bedLabel })}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" fontWeight={700}>
                        {formatPrice(pricePerNight, currency)}{' '}
                        <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
                          {t('property_detail.per_night')}
                        </Typography>
                        {room.hasFlatFees && (
                          <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
                            {' '}· {t('property_detail.fees_included')}
                          </Typography>
                        )}
                      </Typography>
                    </CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        px: 3,
                        py: 3,
                        flexShrink: 0,
                      }}
                    >
                      <Box textAlign="right">
                        <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
                          {formatPrice(room.estimatedTotalUsd, currency)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('property_detail.total_for_nights', { count: nights })} · {t('property_detail.taxes_included')}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        color="warning"
                        startIcon={<BookmarkIcon fontSize="small" />}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
                      >
                        {t('property_detail.book_now')}
                      </Button>
                    </Box>
                  </Card>
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
  );
}