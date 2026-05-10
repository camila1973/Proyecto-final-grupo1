import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../../../hooks/useAuth';
import { useLocale } from '../../../context/LocaleContext';
import HeroBanner from './HeroBanner';
import PageContainer from '../../../components/PageContainer';
import {
  cancelReservation,
  fetchPartnerProperty,
  fetchPartnerPropertyRooms,
  fetchPropertyMetrics,
  fetchPropertyReservations,
  partnerCheckIn,
  partnerCheckOut,
} from '../../../utils/queries';
import { formatPrice } from '../../../utils/currency';
import { currentMonth, formatMonthLabel } from '../../../utils/month';
import MetricCard from '../components/MetricCard';
import MonthSwitcher from '../components/MonthSwitcher';
import ChartsSection from './ChartsSection';
import { TH, TD } from '../dashboard/ui';

const PAGE_SIZE = 10;
const ROOM_TYPE_OPTIONS = ['', 'deluxe', 'suite', 'standard', 'junior_suite', 'penthouse'];
const STATUS_OPTIONS = ['', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'failed', 'expired'];

const NAV_BTN = { bgcolor: '#1B4F8C', color: '#fff', '&:hover': { bgcolor: '#163d6e' } } as const;

interface StatusChipProps { status: string }
function StatusChip({ status }: StatusChipProps) {
  const { t } = useTranslation();
  const palette: Record<string, { bg: string; color: string }> = {
    confirmed:   { bg: '#dbeafe', color: '#1d4ed8' },
    checked_in:  { bg: '#dcfce7', color: '#15803d' },
    checked_out: { bg: '#f3f4f6', color: '#374151' },
    cancelled:   { bg: '#fee2e2', color: '#b91c1c' },
    failed:      { bg: '#fef3c7', color: '#92400e' },
    expired:     { bg: '#fef3c7', color: '#92400e' },
    held:        { bg: '#ede9fe', color: '#6d28d9' },
    submitted:   { bg: '#e0f2fe', color: '#0369a1' },
  };
  const { bg, color } = palette[status] ?? { bg: '#f3f4f6', color: '#374151' };
  return (
    <Chip
      label={t(`partner.dashboard.status.${status}`, { defaultValue: status })}
      size="small"
      sx={{ fontSize: 11, height: 22, bgcolor: bg, color, fontWeight: 600, borderRadius: 1 }}
    />
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor?: 'error' | 'primary' | 'success';
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
function ConfirmDialog({ open, title, description, confirmLabel, confirmColor = 'primary', loading, onClose, onConfirm }: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={() => !loading && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: 14 }}>{description}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} size="small">
          {t('partner.reservation_edit.back_button')}
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
          size="small"
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type PendingAction = { type: 'check_in' | 'check_out' | 'cancel'; reservationId: string };

export default function PropertyDashboardPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { language, currency } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { propertyId } = useParams({ from: '/mi-hotel/$propertyId' });

  const [month, setMonth] = useState(currentMonth());
  const [roomType, setRoomType] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [roomMenu, setRoomMenu] = useState<{ el: HTMLElement; roomId: string } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; reservationId: string; status: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;

  const metricsQuery = useQuery({
    queryKey: ['property-metrics', partnerId, propertyId, month, roomType],
    queryFn: () => fetchPropertyMetrics(partnerId, propertyId, month, roomType || null, token!),
    enabled,
  });

  const reservationsQuery = useQuery({
    queryKey: ['property-reservations', partnerId, propertyId, month, roomType],
    queryFn: () => fetchPropertyReservations(partnerId, propertyId, month, roomType || null, token!),
    enabled,
  });

  const propertyQuery = useQuery({
    queryKey: ['partner-property', partnerId, propertyId],
    queryFn: () => fetchPartnerProperty(partnerId, propertyId, token!),
    enabled,
  });

  const roomsQuery = useQuery({
    queryKey: ['property-rooms', partnerId, propertyId],
    queryFn: () => fetchPartnerPropertyRooms(partnerId, propertyId, token!),
    enabled,
  });

  const invalidateReservations = () => {
    void queryClient.invalidateQueries({ queryKey: ['property-reservations'] });
    void queryClient.invalidateQueries({ queryKey: ['property-metrics'] });
  };

  const checkInMutation = useMutation({
    mutationFn: (id: string) => partnerCheckIn(id, token!),
    onSuccess: () => {
      invalidateReservations();
      setSnack({ msg: t('partner.dashboard.action_success_check_in'), severity: 'success' });
    },
    onError: (err: Error) => setSnack({ msg: err.message || t('partner.dashboard.action_error'), severity: 'error' }),
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => partnerCheckOut(id, token!),
    onSuccess: () => {
      invalidateReservations();
      setSnack({ msg: t('partner.dashboard.action_success_check_out'), severity: 'success' });
    },
    onError: (err: Error) => setSnack({ msg: err.message || t('partner.dashboard.action_error'), severity: 'error' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelReservation(id, token!, 'partner_requested'),
    onSuccess: () => {
      invalidateReservations();
      setSnack({ msg: t('partner.dashboard.action_success_cancel'), severity: 'success' });
    },
    onError: (err: Error) => setSnack({ msg: err.message || t('partner.dashboard.action_error'), severity: 'error' }),
  });

  const isMutating = checkInMutation.isPending || checkOutMutation.isPending || cancelMutation.isPending;

  const isLoading = metricsQuery.isLoading || reservationsQuery.isLoading;
  const isError = metricsQuery.isError || reservationsQuery.isError;

  const propertyName = propertyQuery.data?.propertyName ?? propertyId;
  const propertyAddress = [
    propertyQuery.data?.propertyNeighborhood,
    propertyQuery.data?.propertyCity,
    propertyQuery.data?.propertyCountryCode,
  ].filter(Boolean).join(', ');

  const filteredReservations = useMemo(() => {
    const rows = reservationsQuery.data?.reservations ?? [];
    const q = searchText.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q || r.id.toLowerCase().includes(q) || r.guestName.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reservationsQuery.data, searchText, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredReservations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    const { type, reservationId } = pendingAction;
    setPendingAction(null);
    if (type === 'check_in') checkInMutation.mutate(reservationId);
    else if (type === 'check_out') checkOutMutation.mutate(reservationId);
    else if (type === 'cancel') cancelMutation.mutate(reservationId);
  };

  const confirmDialog = useMemo(() => {
    if (!pendingAction) return null;
    const { type } = pendingAction;
    if (type === 'check_in') return {
      title: t('partner.dashboard.dialog_check_in_title'),
      description: t('partner.dashboard.dialog_check_in_body'),
      confirmLabel: t('partner.dashboard.menu_check_in'),
      confirmColor: 'success' as const,
    };
    if (type === 'check_out') return {
      title: t('partner.dashboard.dialog_check_out_title'),
      description: t('partner.dashboard.dialog_check_out_body'),
      confirmLabel: t('partner.dashboard.menu_check_out'),
      confirmColor: 'primary' as const,
    };
    return {
      title: t('partner.dashboard.dialog_cancel_title'),
      description: t('partner.dashboard.dialog_cancel_body'),
      confirmLabel: t('partner.dashboard.menu_cancel_reservation'),
      confirmColor: 'error' as const,
    };
  }, [pendingAction, t]);

  if (!enabled) {
    return (
      <PageContainer>
        <Alert severity="info">{t('partner.dashboard.login_required')}</Alert>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <Alert severity="error">{t('partner.dashboard.load_error')}</Alert>
      </PageContainer>
    );
  }

  return (
    <div className="min-h-screen">
      <HeroBanner
        propertyName={propertyName}
        propertyId={propertyId}
        address={propertyAddress}
      />

      <PageContainer>

        {/* Filter bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            select
            size="small"
            label={t('partner.dashboard.room_type_filter')}
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            sx={{ width: 220 }}
          >
            {ROOM_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt || 'all'} value={opt} sx={{ fontSize: 12 }}>
                {opt || t('partner.dashboard.all_room_types')}
              </MenuItem>
            ))}
          </TextField>

          <MonthSwitcher month={month} onChange={setMonth} language={language} />
        </Box>

        <div className="grid grid-cols-5 gap-4">
          <MetricCard loading={isLoading} testId="metric-confirmed" label={t('partner.dashboard.metric_confirmed')} value={String(metricsQuery.data?.metrics.confirmed ?? 0)} />
          <MetricCard loading={isLoading} testId="metric-cancelled" label={t('partner.dashboard.metric_cancelled')} value={String(metricsQuery.data?.metrics.cancelled ?? 0)} />
          <MetricCard loading={isLoading} testId="metric-revenue" label={t('partner.dashboard.metric_revenue', { currency })} value={formatPrice(metricsQuery.data?.metrics.revenueUsd ?? 0, currency)} variant="positive" />
          <MetricCard loading={isLoading} testId="metric-losses" label={t('partner.dashboard.metric_losses', { currency })} value={formatPrice(metricsQuery.data?.metrics.lossesUsd ?? 0, currency)} variant="negative" />
          <MetricCard loading={isLoading} testId="metric-net" label={t('partner.dashboard.metric_net', { currency })} value={formatPrice(metricsQuery.data?.metrics.netUsd ?? 0, currency)} variant="positive" />
        </div>

        <ChartsSection
          propertyName={propertyName}
          monthlySeries={metricsQuery.data?.monthlySeries ?? []}
          grossRevenue={metricsQuery.data?.metrics.revenueUsd ?? 0}
          loading={isLoading}
          monthLabel={formatMonthLabel(month, language)}
        />

        {(metricsQuery.data || reservationsQuery.data) && (
          <>
            <Box>
              <Button
                variant="text"
                onClick={() => navigate({ to: '/mi-hotel/$propertyId/pagos', params: { propertyId } })}
                sx={{ fontSize: 12, color: '#1B4F8C', p: 0, textDecoration: 'underline' }}
              >
                {t('partner.dashboard.see_all_payments')}
              </Button>
            </Box>

            {/* ── Reservations table ── */}
            <Box>
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              )}

              <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', mb: 2 }}>
                {t('partner.dashboard.reservations_title')}
              </Typography>

              {/* Search + filters bar */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  placeholder={t('partner.dashboard.reservation_search_placeholder')}
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
                  slotProps={{ input: { endAdornment: <SearchIcon fontSize="small" sx={{ color: '#9ca3af' }} /> } }}
                  sx={{ flexGrow: 1, maxWidth: 320, '& .MuiOutlinedInput-root': { fontSize: 13, borderRadius: 1.5 } }}
                />
                <TextField
                  select
                  size="small"
                  label={t('partner.dashboard.status_filter_label')}
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  sx={{ width: 180, '& .MuiOutlinedInput-root': { fontSize: 13 } }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s || 'all'} value={s} sx={{ fontSize: 13 }}>
                      {s ? t(`partner.dashboard.status.${s}`, { defaultValue: s }) : t('partner.dashboard.status_all')}
                    </MenuItem>
                  ))}
                </TextField>

                <Box sx={{ flexGrow: 1 }} />

                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {filteredReservations.length > 0
                      ? t('partner.dashboard.pagination_label', { from: (safePage - 1) * PAGE_SIZE + 1, to: Math.min(safePage * PAGE_SIZE, filteredReservations.length), total: filteredReservations.length })
                      : ''}
                  </Typography>
                  <IconButton size="small" aria-label={t('partner.dashboard.prev_page')} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} sx={NAV_BTN}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label={t('partner.dashboard.next_page')} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} sx={NAV_BTN}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>

              <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', overflow: 'hidden' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TH>{t('partner.dashboard.col_reservation')}</TH>
                        <TH>{t('partner.dashboard.col_status')}</TH>
                        <TH>{t('partner.dashboard.col_name')}</TH>
                        <TH>{t('partner.dashboard.col_email')}</TH>
                        <TH>{t('partner.dashboard.col_phone')}</TH>
                        <TH>{t('partner.dashboard.col_guests')}</TH>
                        <TH>{t('partner.dashboard.col_check_in')}</TH>
                        <TH>{t('partner.dashboard.col_check_out')}</TH>
                        <TH>{t('partner.dashboard.col_room')}</TH>
                        <TH width={48}>{''}</TH>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pageRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} align="center" sx={{ py: 4, fontSize: 13, color: '#6b7280' }}>
                            {searchText || statusFilter
                              ? t('partner.dashboard.no_results_filter')
                              : t('partner.dashboard.no_reservations')}
                          </TableCell>
                        </TableRow>
                      ) : pageRows.map((r) => {
                        const isActingOn = (checkInMutation.isPending && checkInMutation.variables === r.id)
                          || (checkOutMutation.isPending && checkOutMutation.variables === r.id)
                          || (cancelMutation.isPending && cancelMutation.variables === r.id);

                        const canCheckIn  = r.status === 'confirmed';
                        const canCheckOut = r.status === 'checked_in';
                        const canCancel   = r.status === 'confirmed' || r.status === 'checked_in';
                        const hasActions  = canCheckIn || canCheckOut || canCancel;

                        return (
                          <TableRow
                            key={r.id}
                            sx={{
                              '&:hover': { bgcolor: '#F9FAFB' },
                              opacity: isActingOn ? 0.6 : 1,
                              transition: 'opacity 0.15s',
                            }}
                          >
                            <TD sx={{ fontFamily: 'monospace', color: '#4a5568', letterSpacing: '0.03em' }}>
                              {r.id.slice(0, 8).toUpperCase()}
                            </TD>
                            <TD><StatusChip status={r.status} /></TD>
                            <TD sx={{ fontWeight: 500 }}>{r.guestName}</TD>
                            <TD sx={{ color: '#4a5568' }}>{r.guestEmail}</TD>
                            <TD sx={{ color: '#4a5568' }}>{r.guestPhone}</TD>
                            <TD align="center">{r.guestCount}</TD>
                            <TD>{r.checkIn}</TD>
                            <TD>{r.checkOut}</TD>
                            <TD>{r.roomType}</TD>
                            <TD align="right">
                              {isActingOn ? (
                                <CircularProgress size={16} sx={{ color: '#1B4F8C' }} />
                              ) : hasActions ? (
                                <>
                                  {/* Quick-action icons for common transitions */}
                                  {canCheckIn && (
                                    <Tooltip title={t('partner.dashboard.menu_check_in')} arrow>
                                      <IconButton
                                        size="small"
                                        sx={{ color: '#15803d' }}
                                        onClick={() => setPendingAction({ type: 'check_in', reservationId: r.id })}
                                        disabled={isMutating}
                                        aria-label={t('partner.dashboard.menu_check_in')}
                                      >
                                        <HowToRegOutlinedIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {canCheckOut && (
                                    <Tooltip title={t('partner.dashboard.menu_check_out')} arrow>
                                      <IconButton
                                        size="small"
                                        sx={{ color: '#1B4F8C' }}
                                        onClick={() => setPendingAction({ type: 'check_out', reservationId: r.id })}
                                        disabled={isMutating}
                                        aria-label={t('partner.dashboard.menu_check_out')}
                                      >
                                        <LogoutOutlinedIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {/* More menu for secondary actions */}
                                  <IconButton
                                    size="small"
                                    sx={{ color: '#6b7280' }}
                                    onClick={(e) => setRowMenu({ el: e.currentTarget, reservationId: r.id, status: r.status })}
                                    disabled={isMutating}
                                    aria-label={t('partner.dashboard.row_menu_label')}
                                  >
                                    <MoreVertIcon fontSize="small" />
                                  </IconButton>
                                </>
                              ) : null}
                            </TD>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            {/* ── Rooms table ── */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
                  {t('partner.dashboard.rooms_title')}
                </Typography>
                <Button
                  variant="text"
                  sx={{ fontSize: 12, color: '#1B4F8C', p: 0, textDecoration: 'underline', textTransform: 'none' }}
                >
                  {t('partner.dashboard.manage_rooms')}
                </Button>
              </Box>

              <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', overflow: 'hidden' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TH>{t('partner.dashboard.col_room_type')}</TH>
                        <TH>{t('partner.dashboard.col_capacity')}</TH>
                        <TH>{t('partner.dashboard.col_beds')}</TH>
                        <TH>{t('partner.dashboard.col_base_rate')}</TH>
                        <TH>{t('partner.dashboard.col_availability')}</TH>
                        <TH>{t('partner.dashboard.col_room_status')}</TH>
                        <TH width={40}>{''}</TH>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {roomsQuery.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                            <CircularProgress size={20} />
                          </TableCell>
                        </TableRow>
                      ) : !roomsQuery.data?.rooms.length ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 3, fontSize: 12, color: '#6b7280' }}>
                            {t('partner.dashboard.no_rooms')}
                          </TableCell>
                        </TableRow>
                      ) : roomsQuery.data.rooms.map((room) => {
                        const availPct = Math.round((1 - room.occupancyRate) * 100);
                        const isActive = room.status === 'active';
                        return (
                          <TableRow key={room.roomId} sx={{ '&:hover': { bgcolor: '#F9FAFB' } }}>
                            <TD sx={{ fontWeight: 500 }}>{room.roomType}</TD>
                            <TD>{t('partner.dashboard.guests_count', { count: room.capacity })}</TD>
                            <TD>{room.bedType}</TD>
                            <TD>{formatPrice(room.basePriceUsd, currency)}</TD>
                            <TD>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <LinearProgress
                                  variant="determinate"
                                  value={availPct}
                                  sx={{ width: 80, height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' } }}
                                />
                                <Typography sx={{ fontSize: 11, color: '#4a5568', minWidth: 28 }}>{availPct}%</Typography>
                              </Stack>
                            </TD>
                            <TD>
                              <Chip
                                label={isActive ? t('partner.dashboard.room_active') : t('partner.dashboard.room_no_stock')}
                                size="small"
                                sx={{
                                  fontSize: 11,
                                  height: 22,
                                  bgcolor: isActive ? '#dcfce7' : '#fef3c7',
                                  color: isActive ? '#166534' : '#92400e',
                                  fontWeight: 500,
                                }}
                              />
                            </TD>
                            <TD align="right">
                              <IconButton
                                size="small"
                                sx={{ color: '#6b7280' }}
                                onClick={(e) => setRoomMenu({ el: e.currentTarget, roomId: room.roomId })}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </TD>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              <Menu
                anchorEl={roomMenu?.el}
                open={Boolean(roomMenu)}
                onClose={() => setRoomMenu(null)}
              >
                <MenuItem
                  sx={{ fontSize: 13 }}
                  onClick={() => {
                    if (roomMenu) {
                      navigate({ to: '/mi-hotel/$propertyId/rooms/$roomId', params: { propertyId, roomId: roomMenu.roomId } });
                      setRoomMenu(null);
                    }
                  }}
                >
                  {t('partner.dashboard.menu_view_availability')}
                </MenuItem>
              </Menu>
            </Box>
          </>
        )}
      </PageContainer>

      {/* Row context menu */}
      <Menu
        anchorEl={rowMenu?.el}
        open={Boolean(rowMenu)}
        onClose={() => setRowMenu(null)}
        slotProps={{ paper: { sx: { minWidth: 180, borderRadius: 1.5, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' } } }}
      >
        {rowMenu?.status === 'confirmed' && [
          <MenuItem
            key="checkin"
            sx={{ fontSize: 13, color: '#15803d', gap: 1 }}
            onClick={() => {
              setPendingAction({ type: 'check_in', reservationId: rowMenu.reservationId });
              setRowMenu(null);
            }}
          >
            <HowToRegOutlinedIcon fontSize="small" />
            {t('partner.dashboard.menu_check_in')}
          </MenuItem>,
          <MenuItem
            key="edit"
            sx={{ fontSize: 13 }}
            onClick={() => {
              navigate({ to: '/mi-hotel/$propertyId/reservas/$reservationId/editar', params: { propertyId, reservationId: rowMenu.reservationId } });
              setRowMenu(null);
            }}
          >
            {t('partner.dashboard.menu_edit_reservation')}
          </MenuItem>,
          <MenuItem
            key="cancel"
            sx={{ fontSize: 13, color: '#b91c1c' }}
            onClick={() => {
              setPendingAction({ type: 'cancel', reservationId: rowMenu.reservationId });
              setRowMenu(null);
            }}
          >
            {t('partner.dashboard.menu_cancel_reservation')}
          </MenuItem>,
        ]}
        {rowMenu?.status === 'checked_in' && [
          <MenuItem
            key="checkout"
            sx={{ fontSize: 13, color: '#1B4F8C', gap: 1 }}
            onClick={() => {
              setPendingAction({ type: 'check_out', reservationId: rowMenu.reservationId });
              setRowMenu(null);
            }}
          >
            <LogoutOutlinedIcon fontSize="small" />
            {t('partner.dashboard.menu_check_out')}
          </MenuItem>,
          <MenuItem
            key="cancel"
            sx={{ fontSize: 13, color: '#b91c1c' }}
            onClick={() => {
              setPendingAction({ type: 'cancel', reservationId: rowMenu.reservationId });
              setRowMenu(null);
            }}
          >
            {t('partner.dashboard.menu_cancel_reservation')}
          </MenuItem>,
        ]}
      </Menu>

      {/* Confirmation dialog */}
      {confirmDialog && (
        <ConfirmDialog
          open={Boolean(pendingAction)}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          confirmColor={confirmDialog.confirmColor}
          loading={isMutating}
          onClose={() => setPendingAction(null)}
          onConfirm={handleConfirmAction}
        />
      )}

      {/* Feedback snackbar */}
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity ?? 'success'} onClose={() => setSnack(null)} sx={{ minWidth: 280 }}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </div>
  );
}
