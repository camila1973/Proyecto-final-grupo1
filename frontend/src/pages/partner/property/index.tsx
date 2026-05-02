import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../../../hooks/useAuth';
import { useLocale } from '../../../context/LocaleContext';
import HeroBanner from './HeroBanner';
import {
  fetchPartnerProperty,
  fetchPropertyMetrics,
  fetchPropertyReservations,
} from '../../../utils/queries';
import { formatPrice } from '../../../utils/currency';
import { currentMonth, formatMonthLabel, shiftMonth } from '../../../utils/month';
import MetricCard from '../components/MetricCard';
import ChartsSection from './ChartsSection';
import { TH, TD } from '../dashboard/ui';

const PAGE_SIZE = 10;
const ROOM_TYPE_OPTIONS = ['', 'Doble Superior', 'Suite', 'Sencilla', 'Familiar'];

const NAV_BTN = { bgcolor: '#1B4F8C', color: '#fff', '&:hover': { bgcolor: '#163d6e' } } as const;

export default function PropertyDashboardPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { language, currency } = useLocale();
  const navigate = useNavigate();
  const { propertyId } = useParams({ from: '/mi-hotel/$propertyId' });

  const [month, setMonth] = useState(currentMonth());
  const [roomType, setRoomType] = useState('');
  const [reservationFilter, setReservationFilter] = useState('');
  const [page, setPage] = useState(1);

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

  const isLoading = metricsQuery.isLoading || reservationsQuery.isLoading;
  const isError = metricsQuery.isError || reservationsQuery.isError;

  const propertyName = propertyQuery.data?.propertyName ?? propertyId;
  const propertyAddress = [
    propertyQuery.data?.propertyNeighborhood,
    propertyQuery.data?.propertyCity,
    propertyQuery.data?.propertyCountryCode,
  ].filter(Boolean).join(', ');

  const filteredReservations = useMemo(() => {
    if (!reservationsQuery.data?.reservations) return [];
    const q = reservationFilter.trim().toLowerCase();
    if (!q) return reservationsQuery.data.reservations;
    return reservationsQuery.data.reservations.filter((r) => r.id.toLowerCase().includes(q));
  }, [reservationsQuery.data, reservationFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredReservations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (!enabled) {
    return (
      <Box sx={{ maxWidth: 1152, mx: 'auto', p: 4 }}>
        <Alert severity="info">{t('partner.dashboard.login_required')}</Alert>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ maxWidth: 1152, mx: 'auto', p: 4 }}>
        <Alert severity="error">{t('partner.dashboard.load_error')}</Alert>
      </Box>
    );
  }

  return (
    <div className="min-h-screen">
      <HeroBanner
        propertyName={propertyName}
        propertyId={propertyId}
        address={propertyAddress}
      />

      <div className="max-w-[1152px] mx-auto px-6 py-6 flex flex-col gap-6">


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

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontSize: 12, color: '#4a5568', minWidth: 110, textAlign: 'right' }}>
              {formatMonthLabel(month, language)}
            </Typography>
            <IconButton size="small" aria-label={t('partner.dashboard.prev_month')} onClick={() => setMonth((m) => shiftMonth(m, -1))} sx={NAV_BTN}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label={t('partner.dashboard.next_month')} onClick={() => setMonth((m) => shiftMonth(m, 1))} sx={NAV_BTN}>
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
          </Stack>
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

            {/* Reservations table */}
            <Box>
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
                  {t('partner.dashboard.reservations_title')}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    placeholder={t('partner.dashboard.reservation_search_placeholder')}
                    value={reservationFilter}
                    onChange={(e) => { setReservationFilter(e.target.value); setPage(1); }}
                    slotProps={{ input: { endAdornment: <SearchIcon fontSize="small" sx={{ color: '#9ca3af' }} /> } }}
                    sx={{ width: 220, '& .MuiOutlinedInput-root': { fontSize: 12, borderRadius: 1.5 } }}
                  />
                  <IconButton size="small" aria-label={t('partner.dashboard.prev_page')} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} sx={NAV_BTN}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label={t('partner.dashboard.next_page')} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} sx={NAV_BTN}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>

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
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pageRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center" sx={{ py: 3, fontSize: 12, color: '#6b7280' }}>
                            {t('partner.dashboard.no_reservations')}
                          </TableCell>
                        </TableRow>
                      ) : pageRows.map((r) => (
                        <TableRow key={r.id} sx={{ '&:hover': { bgcolor: '#F9FAFB' } }}>
                          <TD sx={{ fontFamily: 'monospace', color: '#4a5568' }}>{r.id.slice(0, 8)}</TD>
                          <TD>{r.status.toUpperCase()}</TD>
                          <TD>{r.guestName}</TD>
                          <TD>{r.guestEmail}</TD>
                          <TD>{r.guestPhone}</TD>
                          <TD>{r.guestCount}</TD>
                          <TD>{r.checkIn}</TD>
                          <TD>{r.checkOut}</TD>
                          <TD>{r.roomType}</TD>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          </>
        )}
      </div>
    </div>
  );
}
