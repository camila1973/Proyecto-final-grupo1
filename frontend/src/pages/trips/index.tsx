import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../context/LocaleContext';
import {
  fetchMyReservations,
  cancelReservation,
  type ReservationListItem,
  type ReservationStatus,
} from '../../utils/queries';
import { formatPrice } from '../../utils/currency';
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

const ACTIVE_STATUSES: ReservationStatus[] = ['on_hold', 'pending', 'confirmed'];
const PAST_STATUSES: ReservationStatus[] = ['expired', 'cancelled'];

const CANCELLABLE_STATUSES: ReservationStatus[] = ['on_hold', 'pending', 'confirmed'];

function statusChip(status: ReservationStatus, t: (k: string) => string) {
  const map: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
    on_hold:   { label: t('trips.status.on_hold'),   color: '#b45309', bg: '#fef3c7' },
    pending:   { label: t('trips.status.pending'),   color: '#b45309', bg: '#fef3c7' },
    confirmed: { label: t('trips.status.confirmed'), color: '#065f46', bg: '#d1fae5' },
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
  t: (k: string, opts?: Record<string, string>) => string;
  currency: ReturnType<typeof useLocale>['currency'];
}) {
  const canCancel = CANCELLABLE_STATUSES.includes(item.status);
  const shortId = item.id.slice(0, 6).toUpperCase();
  const checkIn = dayjs(item.checkIn).format('MMM DD, YYYY h:mmA');
  const checkOut = dayjs(item.checkOut).format('MMM DD, YYYY h:mmA');
  const bookedOn = dayjs(item.createdAt).format('MMM DD, YYYY');

  return (
    <Box
      sx={{
        display: 'flex',
        border: '1px solid #e5e7eb',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'white',
        gap: 0,
      }}
    >
      {/* Image */}
      <Box
        component="img"
        src={item.property?.thumbnailUrl ?? 'https://placehold.co/180x140?text=Hotel'}
        alt={item.property?.name ?? 'Hotel'}
        sx={{ width: 180, minWidth: 180, objectFit: 'cover' }}
      />

      {/* Content */}
      <Box sx={{ flex: 1, p: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
          {item.property?.name?.toUpperCase() ?? '—'}
        </Typography>
        {item.property?.address && (
          <Typography variant="caption" color="text.secondary">
            {item.property.address}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 0.5 }}>
          <Typography variant="caption">
            <strong>{t('trips.card.reservation_id')}</strong> #{shortId}
          </Typography>
          <Typography variant="caption">
            <strong>{t('trips.card.check_in')}</strong>{' '}
            {checkIn}
          </Typography>
          <Typography variant="caption">
            <strong>{t('trips.card.check_out')}</strong>{' '}
            {checkOut}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
          {statusChip(item.status, t)}
          <Typography variant="caption" color="text.secondary">
            {t('trips.card.booked_on')} {bookedOn}
          </Typography>
        </Box>
      </Box>

      {/* Right: price + action */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          p: 2.5,
          gap: 2,
          minWidth: 180,
        }}
      >
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
      </Box>
    </Box>
  );
}

export default function TripsPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { currency } = useLocale();

  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!token) {
      void navigate({ to: '/login' });
      return;
    }
    fetchMyReservations(token)
      .then((data) => setReservations(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const active = reservations.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const past = reservations.filter((r) => PAST_STATUSES.includes(r.status));

  async function handleConfirmCancel() {
    if (!cancelTarget || !token) return;
    setCancelling(true);
    try {
      await cancelReservation(cancelTarget, token);
      setReservations((prev) =>
        prev.map((r) => (r.id === cancelTarget ? { ...r, status: 'cancelled' as ReservationStatus } : r)),
      );
    } catch {
      // silently ignore — user can retry
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  }

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', py: 20 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Typography color="error">{t('trips.error')}</Typography>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
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
                onCancel={(id) => setCancelTarget(id)}
                cancelling={cancelling && cancelTarget === item.id}
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
                onCancel={(id) => setCancelTarget(id)}
                cancelling={cancelling && cancelTarget === item.id}
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

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelTarget !== null} onClose={() => setCancelTarget(null)}>
        <DialogTitle>{t('trips.cancel_dialog.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('trips.cancel_dialog.body')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelling}>
            {t('trips.cancel_dialog.keep')}
          </Button>
          <Button
            onClick={() => void handleConfirmCancel()}
            disabled={cancelling}
            sx={{ color: '#9f1239' }}
          >
            {cancelling ? <CircularProgress size={16} /> : t('trips.cancel_dialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </main>
  );
}
