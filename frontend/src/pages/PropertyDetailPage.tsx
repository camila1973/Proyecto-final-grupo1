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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import HorizontalCard from '../components/HorizontalCard';

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
): Promise<PropertyRoomsResponse> {
  const params = new URLSearchParams();
  if (checkIn) params.set('checkIn', checkIn);
  if (checkOut) params.set('checkOut', checkOut);
  if (guests) params.set('guests', String(guests));
  const qs = params.toString();
  const res = await fetch(
    `${API_BASE}/api/search/properties/${propertyId}/rooms${qs ? `?${qs}` : ''}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch rooms for property ${propertyId}`);
  return res.json() as Promise<PropertyRoomsResponse>;
}

export default function PropertyDetailPage() {
  const { t } = useTranslation();
  const { currency } = useLocale();
  const { propertyId } = useParams({ from: '/properties/$propertyId' });
  const { checkIn: qCheckIn, checkOut: qCheckOut, guests: qGuests } = useSearch({ from: '/properties/$propertyId' });
  const [checkIn, setCheckIn] = useState<Dayjs | null>(qCheckIn ? dayjs(qCheckIn) : dayjs());
  const [checkOut, setCheckOut] = useState<Dayjs | null>(qCheckOut ? dayjs(qCheckOut) : dayjs().add(8, 'day'));
  const [guests, setGuests] = useState<number>(qGuests > 0 ? qGuests : 1);

  const fromDate = checkIn?.format('YYYY-MM-DD');
  const toDate = checkOut?.format('YYYY-MM-DD');
  const nights = checkOut && checkIn ? Math.max(1, checkOut.diff(checkIn, 'day')) : 1;

  const { data, isPending, isError } = useQuery<PropertyRoomsResponse>({
    queryKey: ['property-rooms', propertyId, fromDate, toDate, guests],
    queryFn: () => fetchPropertyRooms(propertyId, fromDate, toDate, guests),
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

      {/* Image gallery */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl overflow-hidden mb-6 h-64">
        {[0, 1, 2].map((i) => (
          <img key={i} src={property.thumbnailUrl} alt={property.name} className="w-full h-full object-cover" />
        ))}
      </div>

      {/* Property header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 uppercase mb-1">{property.name}</h1>
          <p className="text-gray-500 text-sm">{address}</p>
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
      <section className="mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-2">{t('property_detail.about')}</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          {t('property_detail.about_description', { name: property.name, address })}
        </p>
      </section>

      {/* Amenities */}
      {property.amenities.length > 0 && (
        <section className="mb-8">
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Check in</p>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Check out</p>
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
                {t('property_detail.guests_label')}
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
            {rooms.map((room) => {
              const pricePerNight = room.priceUsd ?? room.basePriceUsd;
              const roomLabel = t(`taxonomies.room_type.${room.roomType}`, { defaultValue: room.roomType });
              const bedLabel = t(`taxonomies.bed_type.${room.bedType}`, { defaultValue: room.bedType });

              return (
                <HorizontalCard
                  key={room.roomId}
                  imageUrl={property.thumbnailUrl}
                  imageAlt={roomLabel}
                  bgcolor="grey.50"
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
                        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
                        {room.hasFlatFees && (
                          <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
                            {' '}· {t('search.card.incl_taxes_fees')}
                          </Typography>
                        )}
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
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
