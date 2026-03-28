import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../context/LocaleContext';
import { formatPrice } from '../utils/currency';
import { API_BASE } from '../env';
import dayjs, { type Dayjs } from 'dayjs';
import Button from '@mui/material/Button';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AddIcon from '@mui/icons-material/Add';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface Room {
  roomId: string;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  basePriceUsd: number;
}

interface PropertyDetail {
  propertyId: string;
  propertyName: string;
  city: string;
  country: string;
  neighborhood: string | null;
  stars: number;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  amenities: string[];
  rooms: Room[];
}

async function fetchProperty(propertyId: string): Promise<PropertyDetail> {
  const res = await fetch(`${API_BASE}/api/search/properties/${propertyId}`);
  if (!res.ok) throw new Error(`Failed to fetch property ${propertyId}`);
  return res.json() as Promise<PropertyDetail>;
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

export default function PropertyDetailPage() {
  const { t } = useTranslation();
  const { currency } = useLocale();
  const { propertyId } = useParams({ from: '/properties/$propertyId' });
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState<Dayjs | null>(dayjs());
  const [checkOut, setCheckOut] = useState<Dayjs | null>(dayjs().add(8, 'day'));

  const { data, isPending, isError } = useQuery<PropertyDetail>({
    queryKey: ['property', propertyId],
    queryFn: () => fetchProperty(propertyId),
  });

  if (isPending) {
    return (
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <p className="text-gray-500">{t('property_detail.loading')}</p>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <p className="text-red-500">{t('property_detail.error')}</p>
      </main>
    );
  }

  const address = [data.neighborhood, data.city, data.country].filter(Boolean).join(', ');
  const availableRooms = data.rooms;

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
      {/* Back button */}
      <Button
        onClick={() => navigate({ to: '/' })}
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
          <img key={i} src={data.thumbnailUrl} alt={data.propertyName} className="w-full h-full object-cover" />
        ))}
      </div>

      {/* Property header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 uppercase mb-1">{data.propertyName}</h1>
          <p className="text-gray-500 text-sm">{address}</p>
        </div>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon fontSize="small" />}
          sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Seleccionar habitacion
        </Button>
      </div>

      {/* About */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-2">Acerca del hotel</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          {data.propertyName} está ubicado en {address}. Ofrece instalaciones de primera clase y un servicio excepcional para garantizar la comodidad de sus huéspedes durante toda su estadía.
        </p>
      </section>

      {/* Amenities */}
      {data.amenities.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3">{t('property_detail.amenities')}</h2>
          <div className="flex flex-wrap gap-2">
            {data.amenities.map((amenity) => (
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
            <span className="font-bold text-gray-900">{availableRooms.length} habitaciones</span> disponibles encontradas
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar filters */}
          <div className="md:w-56 shrink-0 flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Check in</p>
              <DatePicker
                value={checkIn}
                onChange={(val) => setCheckIn(val)}
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
                minDate={checkIn ?? undefined}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    sx: { '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } },
                  },
                }}
              />
            </div>
          </div>

          {/* Room list */}
          <div className="flex-1 flex flex-col gap-4">
            {data.rooms.map((room) => {
              const pricePerNight = room.basePriceUsd;
              const nights = checkOut && checkIn ? Math.max(1, checkOut.diff(checkIn, 'day')) : 1;
              const totalPrice = pricePerNight * nights;
              const roomLabel = ROOM_TYPE_LABELS[room.roomType] ?? room.roomType;
              const bedLabel = BED_TYPE_LABELS[room.bedType] ?? room.bedType;

              return (
                <Card key={room.roomId} variant="outlined" sx={{ display: 'flex', borderRadius: 3, overflow: 'hidden', bgcolor: 'grey.50' }}>
                  <CardMedia
                    component="img"
                    image={data.thumbnailUrl}
                    alt={roomLabel}
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
                          Capacidad para {room.capacity} huéspedes
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary">
                          Posee {bedLabel}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" fontWeight={700}>
                      {formatPrice(pricePerNight, currency)}{' '}
                      <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
                        {t('property_detail.per_night')}
                      </Typography>
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
                        {formatPrice(totalPrice, currency)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        por {nights} noches
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<BookmarkIcon fontSize="small" />}
                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
                    >
                      Reservar
                    </Button>
                  </Box>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
