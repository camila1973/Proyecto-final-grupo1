import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../../../../hooks/useAuth';
import { useLocale, type Currency } from '../../../../context/LocaleContext';
import PageContainer from '../../../../components/PageContainer';
import {
  cancelReservation,
  fetchRefundQuote,
  fetchReservationDetail,
  modifyReservation,
  type RefundQuote,
} from '../../../../utils/queries';
import { formatPrice } from '../../../../utils/currency';
import { FieldLabel } from '../edit/components';
import {
  diffPayload,
  emptyForm,
  fromReservation,
  nightsBetween,
  validateForm,
  type FormErrors,
  type ReservationEditForm,
} from './shared';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ReservationEditPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { currency } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { propertyId, reservationId } = useParams({
    from: '/mi-hotel/$propertyId/reservas/$reservationId/editar',
  });

  const enabled = !!token && !!user;

  const [form, setForm] = useState<ReservationEditForm>(emptyForm());
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const reservationQuery = useQuery({
    queryKey: ['reservation-detail', reservationId],
    queryFn: () => fetchReservationDetail(reservationId, token!),
    enabled,
  });

  const reservation = reservationQuery.data ?? null;

  if (reservation && seededFor !== reservation.id + reservation.checkIn + reservation.checkOut) {
    setSeededFor(reservation.id + reservation.checkIn + reservation.checkOut);
    setForm(fromReservation(reservation));
    setErrors({});
  }

  const refundQuoteQuery = useQuery({
    queryKey: ['refund-quote', reservationId],
    queryFn: () => fetchRefundQuote(reservationId, token!),
    enabled: enabled && cancelOpen,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!reservation) throw new Error('not_loaded');
      return modifyReservation(reservationId, token!, diffPayload(form, reservation));
    },
    onSuccess: () => {
      setSavedAt(Date.now());
      void queryClient.invalidateQueries({ queryKey: ['reservation-detail', reservationId] });
      void queryClient.invalidateQueries({ queryKey: ['property-reservations'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelReservation(reservationId, token!, 'partner_requested'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['property-reservations'] });
      navigate({ to: '/mi-hotel/$propertyId', params: { propertyId }, search: { tab: 'reservas' } });
    },
  });

  const nights = useMemo(
    () => nightsBetween(form.checkIn || todayIso(), form.checkOut || todayIso()),
    [form.checkIn, form.checkOut],
  );

  if (!enabled) {
    return (
      <PageContainer>
        <Alert severity="info">{t('partner.reservation_edit.login_required')}</Alert>
      </PageContainer>
    );
  }

  if (reservationQuery.isError) {
    return (
      <PageContainer>
        <Alert severity="error">{t('partner.reservation_edit.load_error')}</Alert>
      </PageContainer>
    );
  }

  if (reservationQuery.isLoading || !reservation) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const update = <K extends keyof ReservationEditForm>(key: K, value: ReservationEditForm[K]) =>
    setForm({ ...form, [key]: value });

  const isEditable = reservation.status === 'confirmed';
  const shortId = reservation.id.slice(0, 6).toUpperCase();
  const pricePerNight = nights > 0 && reservation.grandTotalUsd
    ? reservation.grandTotalUsd / nights
    : 0;

  const handleSave = () => {
    const errs = validateForm(form, todayIso(), t);
    setErrors(errs);
    if (Object.keys(errs).length === 0) saveMutation.mutate();
  };

  const handleBack = () =>
    navigate({ to: '/mi-hotel/$propertyId', params: { propertyId }, search: { tab: 'reservas' } });

  const saveError = saveMutation.error
    ? saveMutation.error instanceof Error
      ? saveMutation.error.message
      : t('partner.reservation_edit.save_error')
    : null;

  return (
    <PageContainer>
      <Box sx={{ mb: 2 }}>
        <Button variant="text" onClick={handleBack} sx={{ fontSize: 12, color: '#1B4F8C', p: 0 }}>
          {t('partner.reservation_edit.back')}
        </Button>
      </Box>

      <Typography sx={{ fontSize: 22, fontWeight: 600, mb: 3 }}>
        {t('partner.reservation_edit.page_title', { shortId })}
      </Typography>

      {!isEditable && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('partner.reservation_edit.not_editable')}
        </Alert>
      )}

      {savedAt && !saveMutation.isPending && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSavedAt(null)}>
          {t('partner.reservation_edit.saved')}
        </Alert>
      )}

      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }}>{saveError}</Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 3 }}>
        <Card sx={{ p: 3 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1a2332', mb: 2 }}>
            {t('partner.reservation_edit.section_order')}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <FieldLabel>{t('partner.reservation_edit.first_name')}</FieldLabel>
              <TextField
                fullWidth
                size="small"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                error={!!errors.firstName}
                helperText={errors.firstName}
                disabled={!isEditable}
                inputProps={{ 'aria-label': 'firstName' }}
              />
            </Box>
            <Box>
              <FieldLabel>{t('partner.reservation_edit.last_name')}</FieldLabel>
              <TextField
                fullWidth
                size="small"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                error={!!errors.lastName}
                helperText={errors.lastName}
                disabled={!isEditable}
                inputProps={{ 'aria-label': 'lastName' }}
              />
            </Box>
            <Box sx={{ gridColumn: { sm: 'span 2' } }}>
              <FieldLabel>{t('partner.reservation_edit.email')}</FieldLabel>
              <TextField
                fullWidth
                size="small"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                disabled={!isEditable}
                inputProps={{ 'aria-label': 'email' }}
              />
            </Box>
            <Box sx={{ gridColumn: { sm: 'span 2' } }}>
              <FieldLabel>{t('partner.reservation_edit.phone')}</FieldLabel>
              <TextField
                fullWidth
                size="small"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                disabled={!isEditable}
                inputProps={{ 'aria-label': 'phone' }}
              />
            </Box>
          </Box>

          <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1a2332', mt: 3, mb: 2 }}>
            {t('partner.reservation_edit.section_dates')}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <FieldLabel>{t('partner.reservation_edit.check_in')}</FieldLabel>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={form.checkIn}
                onChange={(e) => update('checkIn', e.target.value)}
                disabled={!isEditable}
                inputProps={{ 'aria-label': 'checkIn' }}
              />
            </Box>
            <Box>
              <FieldLabel>{t('partner.reservation_edit.check_out')}</FieldLabel>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={form.checkOut}
                onChange={(e) => update('checkOut', e.target.value)}
                disabled={!isEditable}
                inputProps={{ 'aria-label': 'checkOut' }}
              />
            </Box>
            {errors.dates && (
              <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                <Typography color="error" sx={{ fontSize: 12 }}>{errors.dates}</Typography>
              </Box>
            )}
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!isEditable || saveMutation.isPending}
              loading={saveMutation.isPending}
            >
              {t('partner.reservation_edit.save')}
            </Button>
            <Button variant="outlined" onClick={handleBack} disabled={saveMutation.isPending}>
              {t('partner.reservation_edit.back_button')}
            </Button>
            {isEditable && (
              <Button
                variant="text"
                color="error"
                onClick={() => setCancelOpen(true)}
                disabled={saveMutation.isPending || cancelMutation.isPending}
                sx={{ ml: 'auto' }}
              >
                {t('partner.reservation_edit.cancel_reservation')}
              </Button>
            )}
          </Stack>
        </Card>

        <Card sx={{ p: 3 }}>
          {reservation.snapshot?.propertyThumbnailUrl && (
            <Box
              component="img"
              src={reservation.snapshot.propertyThumbnailUrl}
              alt={reservation.snapshot.propertyName}
              sx={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 1, mb: 2 }}
            />
          )}
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1a2332' }}>
            {reservation.snapshot?.propertyName ?? '—'}
          </Typography>
          {reservation.snapshot && (
            <Typography sx={{ fontSize: 12, color: '#5a6a7e', mb: 2 }}>
              {[reservation.snapshot.propertyNeighborhood, reservation.snapshot.propertyCity]
                .filter(Boolean)
                .join(', ')}
            </Typography>
          )}

          <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 12, color: '#5a6a7e' }}>
                {t('partner.reservation_edit.summary.price_per_night')}
              </Typography>
              <Typography sx={{ fontSize: 13 }}>{formatPrice(pricePerNight, currency)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 12, color: '#5a6a7e' }}>
                {t('partner.reservation_edit.summary.nights_other', { count: nights })}
              </Typography>
              <Typography sx={{ fontSize: 13 }}>{nights}</Typography>
            </Stack>
            {reservation.grandTotalUsd != null && (
              <Stack direction="row" justifyContent="space-between" sx={{ pt: 1, borderTop: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  {t('partner.reservation_edit.summary.total')}
                </Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                  {formatPrice(reservation.grandTotalUsd, currency)}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Card>
      </Box>

      <CancelDialog
        open={cancelOpen}
        loading={refundQuoteQuery.isLoading}
        quote={refundQuoteQuery.data ?? null}
        cancelling={cancelMutation.isPending}
        onClose={() => !cancelMutation.isPending && setCancelOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
        currency={currency}
      />
    </PageContainer>
  );
}

interface CancelDialogProps {
  open: boolean;
  loading: boolean;
  quote: RefundQuote | null;
  cancelling: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currency: Currency;
}

function CancelDialog({ open, loading, quote, cancelling, onClose, onConfirm, currency }: CancelDialogProps) {
  const { t } = useTranslation();

  let policyText: string;
  if (loading || !quote) {
    policyText = t('partner.reservation_edit.cancel_dialog.loading_quote');
  } else if (quote.policy === 'full_refund') {
    policyText = t('partner.reservation_edit.cancel_dialog.policy_full', {
      amount: formatPrice(quote.refundableUsd, currency),
    });
  } else if (quote.policy === 'partial_refund') {
    policyText = t('partner.reservation_edit.cancel_dialog.policy_partial', {
      amount: formatPrice(quote.refundableUsd, currency),
      days: quote.daysUntilCheckIn,
    });
  } else {
    policyText = t('partner.reservation_edit.cancel_dialog.policy_none');
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('partner.reservation_edit.cancel_dialog.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{policyText}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={cancelling}>
          {t('partner.reservation_edit.cancel_dialog.keep')}
        </Button>
        <Button color="error" onClick={onConfirm} disabled={cancelling || loading}>
          {cancelling ? <CircularProgress size={16} /> : t('partner.reservation_edit.cancel_dialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
