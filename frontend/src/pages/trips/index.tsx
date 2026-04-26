import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../context/LocaleContext';
import { saveCheckoutIntent } from '../../hooks/useBookingFlow';
import {
  fetchMyReservations,
  cancelReservation,
  type ReservationListItem,
  type ReservationStatus,
} from '../../utils/queries';
import { formatPrice } from '../../utils/currency';
import { formatAddress } from '../../utils/address';
import HorizontalCard from '../../components/HorizontalCard';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import ScheduleIcon from '@mui/icons-material/Schedule';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

const ACTIVE_STATUSES: ReservationStatus[] = ['held', 'submitted', 'confirmed'];
const PAST_STATUSES: ReservationStatus[] = ['cancelled', 'failed'];

const STATUS_PILL_STYLE: Record<ReservationStatus, { color: string; bg: string; borderColor: string }> = {
  held:      { color: 'warning.dark',  bg: 'warning.light', borderColor: 'warning.main' },
  submitted: { color: 'warning.dark',  bg: 'warning.light', borderColor: 'warning.main' },
  confirmed: { color: 'success.dark', bg: 'success.light', borderColor: 'success.main' },
  failed:    { color: 'error.main',   bg: 'error.contrastText',   borderColor: 'error.main' },
  expired:   { color: '#6b7280',      bg: '#f3f4f6',       borderColor: '#d1d5db' },
  cancelled: { color: 'error.main',   bg: 'error.contrastText',   borderColor: 'error.main' },
};

function StatusPill({ status, t }: { status: ReservationStatus; t: (k: string) => string }) {
  const s = STATUS_PILL_STYLE[status] ?? STATUS_PILL_STYLE.expired;
  return (
    <Chip
      label={t(`trips.status.${status}`)}
      size="small"
      sx={{
        bgcolor: s.bg,
        color: s.color,
        border: '1px solid',
        borderColor: s.borderColor,
        fontSize: '11px',
        fontWeight: 500,
        height: 20,
        borderRadius: '999px',
      }}
    />
  );
}

function ReservationCard({
  item,
  onCancel,
  onCompletePayment,
  cancelling,
  t,
  currency,
}: {
  item: ReservationListItem;
  onCancel: (id: string) => void;
  onCompletePayment: (item: ReservationListItem) => void;
  cancelling: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  currency: ReturnType<typeof useLocale>['currency'];
}) {
  const isPast = PAST_STATUSES.includes(item.status);
  const isHeld = item.status === 'held';
  const shortId = item.id.slice(0, 6).toUpperCase();
  const checkIn = dayjs(item.checkIn).format('MMM D, YYYY') + ' · 3:00 PM';
  const checkOut = dayjs(item.checkOut).format('MMM D, YYYY') + ' · 12:00 PM';
  const bookedOn = dayjs(item.createdAt).format('MMM D, YYYY');
  const { snapshot } = item;
  const address = snapshot
    ? formatAddress(snapshot.propertyNeighborhood, snapshot.propertyCity, snapshot.propertyCountryCode)
    : null;

  const priceLabel = isPast
    ? t('trips.card.not_charged')
    : isHeld || item.status === 'submitted'
      ? t('trips.card.pending_payment')
      : t('trips.card.total_paid');

  const cardBorder = isHeld ? '1.5px dashed' : undefined;
  const cardBorderColor = isHeld ? 'warning.main' : undefined;
  const cardBg = isHeld ? 'warning.light' : 'white';

  let actionButton: React.ReactNode = null;
  if (isHeld) {
    actionButton = (
      <Button
        onClick={() => onCompletePayment(item)}
        endIcon={<ArrowOutwardIcon />}
        variant="contained"
        color="warning"
      >
        {t('trips.card.complete_payment')}
      </Button>
    );
  } else if (item.status === 'submitted' || item.status === 'confirmed') {
    actionButton = (
      <Button
        disabled={cancelling}
        onClick={() => onCancel(item.id)}
        variant="contained"
        color="error"
        loading={cancelling}
      >
        {t('trips.card.cancel')}
      </Button>
    );
  }

  return (
    <HorizontalCard
      imageUrl={snapshot?.propertyThumbnailUrl ?? ''}
      imageAlt={snapshot?.propertyName ?? 'Hotel'}
      imageWidth={120}
      imageFilter={isPast ? 'grayscale(0.6)' : undefined}
      contentPadding={2}
      bgcolor={cardBg}
      sx={{ border: cardBorder, borderColor: cardBorderColor, opacity: isPast ? 0.85 : 1 }}
      middleContent={
        <>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 15, fontWeight: 500, color: isPast ? '#4a5568' : '#1a1a1a' }}>
                  {snapshot?.propertyName ?? '—'}
                </Typography>
                <StatusPill status={item.status} t={t} />
              </Box>
              {address && (
                <Typography sx={{ fontSize: 12, color: isPast ? '#6b7280' : '#4a5568' }}>
                  {address}
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: isPast ? '#6b7280' : '#1a1a1a',
                  textDecoration: isPast ? 'line-through' : 'none',
                }}
              >
                {formatPrice(item.grandTotalUsd, currency)}
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#4a5568', mt: 0.125 }}>
                {priceLabel}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
              mt: 1.25,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box
                component="span"
                sx={{
                  fontFamily: 'monospace',
                  bgcolor: '#F5F7FA',
                  px: '7px',
                  py: '2px',
                  borderRadius: '4px',
                  fontSize: 12,
                  color: isPast ? '#4a5568' : '#1a1a1a',
                }}
              >
                #{shortId}
              </Box>
              <Typography component="span" sx={{ fontSize: 12, color: isPast ? '#6b7280' : '#4a5568' }}>
                <Box component="span" sx={{ fontWeight: 500, color: isPast ? '#6b7280' : '#1a1a1a' }}>
                  {t('trips.card.check_in')}
                </Box>{' '}
                {checkIn}
              </Typography>
              <Typography component="span" sx={{ fontSize: 12, color: isPast ? '#6b7280' : '#4a5568' }}>
                <Box component="span" sx={{ fontWeight: 500, color: isPast ? '#6b7280' : '#1a1a1a' }}>
                  {t('trips.card.check_out')}
                </Box>{' '}
                {checkOut}
              </Typography>
              <Typography component="span" sx={{ fontSize: 12, color: '#6b7280' }}>
                {t('trips.card.booked_on')} {bookedOn}
              </Typography>
            </Box>
            {actionButton}
          </Box>
        </>
      }
    />
  );
}

export default function TripsPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { currency } = useLocale();
  const queryClient = useQueryClient();

  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const { data: reservations = [], isPending, isError } = useQuery({
    queryKey: ['my-reservations', user?.id],
    queryFn: () => fetchMyReservations(token!, user!.id),
    enabled: !!token && !!user,
  });

  const { mutate: doCancel, isPending: cancelling, variables: cancellingId } = useMutation({
    mutationFn: (id: string) => cancelReservation(id, token!, 'user_requested'),
    onSuccess: (_, id) => {
      queryClient.setQueryData<ReservationListItem[]>(
        ['my-reservations', user?.id],
        (prev) => prev?.map((r) => (r.id === id ? { ...r, status: 'cancelled' as ReservationStatus } : r)),
      );
      setCancelTarget(null);
    },
  });

  function handleCompletePayment(item: ReservationListItem) {
    saveCheckoutIntent({
      property: { id: item.propertyId, name: item.snapshot?.propertyName ?? '' },
      room: {
        id: item.roomId,
        type: item.snapshot?.roomType ?? '',
        partnerId: item.partnerId,
        totalUsd: item.grandTotalUsd,
        thumbnailUrl: item.snapshot?.propertyThumbnailUrl ?? undefined,
      },
      stay: { checkIn: item.checkIn, checkOut: item.checkOut, guests: 1 },
    });
    void navigate({ to: '/booking/checkout' });
  }

  if (!token || !user) {
    void navigate({ to: '/login' });
    return null;
  }

  if (isPending) {
    return (
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', py: 20 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <main className="w-full max-w-[1152px] mx-auto px-6 py-12">
        <Typography color="error">{t('trips.error')}</Typography>
      </main>
    );
  }

  const active = reservations.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const past = reservations.filter((r) => PAST_STATUSES.includes(r.status));
  const heldReservation = active.find((r) => r.status === 'held') ?? null;

  return (
    <main className="w-full max-w-[1152px] mx-auto px-6 py-12">
      <Typography sx={{ fontSize: 22, fontWeight: 500, mb: 3 }}>
        {t('trips.title')}
      </Typography>

      {heldReservation && (
        <Alert
          severity="warning"
          icon={
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 18, color: 'black' }} />
            </Box>
          }
          sx={{ mb: 3, alignItems: 'center', bgcolor: 'warning.light', border: '1.5px solid', borderColor: 'warning.main' }}
          action={
            <Button
              onClick={() => handleCompletePayment(heldReservation)}
              endIcon={<ArrowOutwardIcon />}
              variant="contained"
              color="warning"
            >
              {t('trips.banner.cta')}
            </Button>
          }
        >
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
            {t('trips.banner.title')}
          </Typography>
          <Typography sx={{ fontSize: 12 }}>
            {t('trips.banner.subtitle', { propertyName: heldReservation.snapshot?.propertyName ?? '' })}
          </Typography>
        </Alert>
      )}

      {active.length > 0 && (
        <Box mb={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.75 }}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 500,
                color: '#4a5568',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {t('trips.section.active')}
            </Typography>
            <Chip
              label={active.length}
              size="small"
              sx={{ bgcolor: '#E8EFF7', color: 'primary.main', fontWeight: 500, fontSize: '11px', height: 20 }}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {active.map((item) => (
              <ReservationCard
                key={item.id}
                item={item}
                onCancel={setCancelTarget}
                onCompletePayment={handleCompletePayment}
                cancelling={cancelling && cancellingId === item.id}
                t={t}
                currency={currency}
              />
            ))}
          </Box>
        </Box>
      )}

      {past.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.75 }}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 500,
                color: '#4a5568',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {t('trips.section.past')}
            </Typography>
            <Chip
              label={past.length}
              size="small"
              sx={{ bgcolor: '#F5F7FA', color: '#4a5568', border: '0.5px solid #e2e8f0', fontWeight: 500, fontSize: '11px', height: 20 }}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {past.map((item) => (
              <ReservationCard
                key={item.id}
                item={item}
                onCancel={setCancelTarget}
                onCompletePayment={handleCompletePayment}
                cancelling={cancelling && cancellingId === item.id}
                t={t}
                currency={currency}
              />
            ))}
          </Box>
        </Box>
      )}

      {active.length === 0 && past.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography color="text.secondary" mb={3}>
            {t('trips.empty')}
          </Typography>
          <Button variant="contained" onClick={() => void navigate({ to: '/' })}>
            {t('trips.explore')}
          </Button>
        </Box>
      )}

      <Dialog open={cancelTarget !== null} onClose={() => !cancelling && setCancelTarget(null)}>
        <DialogTitle>{t('trips.cancel_dialog.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('trips.cancel_dialog.body')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelling}>
            {t('trips.cancel_dialog.keep')}
          </Button>
          <Button
            color="error"
            onClick={() => cancelTarget && doCancel(cancelTarget)}
            disabled={cancelling}
          >
            {cancelling ? <CircularProgress size={16} /> : t('trips.cancel_dialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </main>
  );
}
