import { useTranslation } from 'react-i18next';
import { formatPrice } from '../../utils/currency';
import type { Currency } from '../../context/LocaleContext';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import HorizontalCard from '../../components/HorizontalCard';

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

interface BookParams {
  property: { id: string; name: string };
  room: {
    id: string;
    type: string;
    partnerId: string;
    totalUsd: number;
    thumbnailUrl: string;
    bedType: string;
  };
  stay: { checkIn: string; checkOut: string; guests: number };
}

interface RoomListProps {
  rooms: SearchRoom[];
  isFetching: boolean;
  nights: number;
  currency: Currency;
  heroImg: string;
  propertyId: string;
  propertyName: string;
  fromDate: string;
  toDate: string;
  guests: number;
  onBook: (params: BookParams) => void;
}

export default function RoomList({
  rooms,
  isFetching,
  nights,
  currency,
  heroImg,
  propertyId,
  propertyName,
  fromDate,
  toDate,
  guests,
  onBook,
}: RoomListProps) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="mb-6">
        <p className="text-sm text-gray-700 text-right">
          <span className="font-bold">{t('property_detail.rooms_count', { count: rooms.length })}</span>
          {` ${t('property_detail.rooms_available')}`}
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        {isFetching && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.6)',
              borderRadius: 2,
            }}
          >
            <CircularProgress size={36} />
          </Box>
        )}

        {rooms.length === 0 ? (
          <p className="text-sm italic text-gray-500">{t('property_detail.no_rooms')}</p>
        ) : (
          rooms.map((room) => {
            const pricePerNight = room.priceUsd ?? room.basePriceUsd;
            const roomLabel = t(`taxonomies.room_type.${room.roomType}`, { defaultValue: room.roomType });
            const bedLabel = t(`taxonomies.bed_type.${room.bedType}`, { defaultValue: room.bedType });

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
                      sx={{ whiteSpace: 'nowrap', borderRadius: 1 }}
                      onClick={() =>
                        onBook({
                          property: { id: propertyId, name: propertyName },
                          room: {
                            id: room.roomId,
                            type: room.roomType,
                            partnerId: room.partnerId ?? '',
                            totalUsd: room.estimatedTotalUsd,
                            thumbnailUrl: heroImg,
                            bedType: room.bedType,
                          },
                          stay: { checkIn: fromDate, checkOut: toDate, guests },
                        })
                      }
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
  );
}
