import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../context/LocaleContext';
import {
  fetchMyReservations,
  cancelReservation,
  type ReservationListItem,
  type ReservationStatus,
} from '../../utils/queries';
import { formatPrice } from '../../utils/currency';
import { formatAddress } from '../../utils/address';
import HorizontalCard from '../../components/HorizontalCard';
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
const PAST_STATUSES: ReservationStatus[] = ['expired', 'cancelled', 'failed'];
const CANCELLABLE_STATUSES: ReservationStatus[] = ['held', 'submitted', 'confirmed'];

function statusChip(status: ReservationStatus, t: (k: string) => string) {
  const map: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
    held:      { label: t('trips.status.held'),      color: '#b45309', bg: '#fef3c7' },
    submitted: { label: t('trips.status.submitted'), color: '#b45309', bg: '#fef3c7' },
    confirmed: { label: t('trips.status.confirmed'), color: '#065f46', bg: '#d1fae5' },
    failed:    { label: t('trips.status.failed'),    color: '#ffffff', bg: '#b91c1c' },
    expired:   { label: t('trips.status.expired'),   color: '#6b7280', bg: '#f3f4f6' },
    cancelled: { label: t('trips.status.cancelled'), color: '#ffffff', bg: '#9f1239' },
  };
  const s = map[status] ?? map.expired;
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.75rem', borderRadius: 1 }}
    />
  );
}

function ReservationCard({
  item,
  onCancel,
  cancelling,
  t,
  currency,
}: {
  item: ReservationListItem;
  onCancel: (id: string) => void;
  cancelling: boolean;
  t: (k: string) => string;
  currency: ReturnType<typeof useLocale>['currency'];
}) {
  const canCancel = CANCELLABLE_STATUSES.includes(item.status);
  const shortId = item.id.slice(0, 6).toUpperCase();
  const checkIn = dayjs(item.checkIn).format('MMM DD, YYYY h:mmA');
  const checkOut = dayjs(item.checkOut).format('MMM DD, YYYY h:mmA');
  const bookedOn = dayjs(item.createdAt).format('MMM DD, YYYY');
  const { snapshot } = item;
  const address = snapshot
    ? formatAddress(snapshot.propertyNeighborhood, snapshot.propertyCity, snapshot.propertyCountryCode)
    : null;

  return (
    <HorizontalCard
      imageUrl={snapshot?.propertyThumbnailUrl ?? ''}
      imageAlt={snapshot?.propertyName ?? 'Hotel'}
      imageWidth={180}
      middleContent={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
            {snapshot?.propertyName?.toUpperCase() ?? '—'}
          </Typography>
          {address && (
            <Typography variant="caption" color="text.secondary">
              {address}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 0.5 }}>
            <Typography variant="caption">
              <strong>{t('trips.card.reservation_id')}</strong> #{shortId}
            </Typography>
            <Typography variant="caption">
              <strong>{t('trips.card.check_in')}</strong> {checkIn}
            </Typography>
            <Typography variant="caption">
              <strong>{t('trips.card.check_out')}</strong> {checkOut}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
            {statusChip(item.status, t)}
            <Typography variant="caption" color="text.secondary">
              {t('trips.card.booked_on')} {bookedOn}
            </Typography>
          </Box>
        </Box>
      }
      rightPanel={
        <>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {formatPrice(item.grandTotalUsd, currency)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('trips.card.total_paid')}
            </Typography>
          </Box>
          {canCancel && (
            <Button
              variant="contained"
              size="small"
              disabled={cancelling}
              onClick={() => onCancel(item.id)}
              sx={{
                bgcolor: '#9f1239',
                '&:hover': { bgcolor: '#7f1d1d' },
                borderRadius: 1.5,
                fontWeight: 600,
                px: 2.5,
              }}
            >
              {cancelling ? <CircularProgress size={16} color="inherit" /> : t('trips.card.cancel')}
            </Button>
          )}
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

  return (
    <main className="w-full max-w-[1152px] mx-auto px-6 py-12">
      <Typography variant="h4" fontWeight={700} mb={4}>
        {t('trips.title')}
      </Typography>

      {active.length > 0 && (
        <Box mb={5}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            {t('trips.section.active')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {active.map((item) => (
              <ReservationCard
                key={item.id}
                item={item}
                onCancel={setCancelTarget}
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
          <Typography variant="h6" fontWeight={700} mb={2}>
            {t('trips.section.past')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {past.map((item) => (
              <ReservationCard
                key={item.id}
                item={item}
                onCancel={setCancelTarget}
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
            color='error'
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
