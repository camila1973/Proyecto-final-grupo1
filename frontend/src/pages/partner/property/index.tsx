import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import PageHero from '../../../components/PageHero';
import { useAuth } from '../../../hooks/useAuth';
import { useLocale } from '../../../context/LocaleContext';
import {
  fetchPartnerHotelState,
  type PartnerPropertiesResponse,
} from '../../../utils/queries';
import { formatPrice } from '../../../utils/currency';
import { currentMonth, formatMonthLabel, shiftMonth } from '../../../utils/month';
import MetricCard from '../components/MetricCard';
import MonthlyChart from '../components/MonthlyChart';
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
  const queryClient = useQueryClient();

  const [month, setMonth] = useState(currentMonth());
  const [roomType, setRoomType] = useState('');
  const [reservationFilter, setReservationFilter] = useState('');
  const [page, setPage] = useState(1);

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['partner-hotel-state', partnerId, month, roomType, propertyId],
    queryFn: () => fetchPartnerHotelState(partnerId, month, roomType || null, token!, propertyId),
    enabled,
  });

  const cachedProperties = queryClient.getQueryData<PartnerPropertiesResponse>([
    'partner-properties',
    partnerId,
  ]);
  const propertyName =
    cachedProperties?.properties.find((p) => p.propertyId === propertyId)?.propertyName ?? propertyId;

  const filteredReservations = useMemo(() => {
    if (!data?.reservations) return [];
    const q = reservationFilter.trim().toLowerCase();
    if (!q) return data.reservations;
    return data.reservations.filter((r) => r.id.toLowerCase().includes(q));
  }, [data, reservationFilter]);

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

  return (
    <Box className="bg-[#F5F7FA] min-h-screen">
      <PageHero>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Button
              variant="text"
              sx={{ color: 'rgba(255,255,255,0.8)', mb: 0.5, p: 0, minWidth: 0, fontSize: 12 }}
              onClick={() => navigate({ to: '/mi-hotel' })}
            >
              {t('partner.properties.back')}
            </Button>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {propertyName}
            </Typography>
          </Box>
        </Box>
      </PageHero>

      <Box sx={{ maxWidth: 1152, mx: 'auto', px: 3, py: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* Month navigator */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
            {t('partner.dashboard.state_title')}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
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

        {/* Room type filter */}
        <TextField
          select
          size="small"
          label={t('partner.dashboard.room_type_filter')}
          value={roomType}
          onChange={(e) => setRoomType(e.target.value)}
          sx={{ maxWidth: 220, '& .MuiOutlinedInput-root': { fontSize: 12, borderRadius: 1.5 } }}
        >
          {ROOM_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt || 'all'} value={opt} sx={{ fontSize: 12 }}>
              {opt || t('partner.dashboard.all_room_types')}
            </MenuItem>
          ))}
        </TextField>

        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} /></Box>}
        {isError && <Alert severity="error">{t('partner.dashboard.load_error')}</Alert>}

        {data && (
          <>
            <MonthlyChart data={data.monthlySeries} />

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <MetricCard testId="metric-confirmed" label={t('partner.dashboard.metric_confirmed')} value={String(data.metrics.confirmed)} />
              <MetricCard testId="metric-cancelled" label={t('partner.dashboard.metric_cancelled')} value={String(data.metrics.cancelled)} />
              <MetricCard testId="metric-revenue" label={t('partner.dashboard.metric_revenue', { currency })} value={formatPrice(data.metrics.revenueUsd, currency)} variant="positive" />
              <MetricCard testId="metric-losses" label={t('partner.dashboard.metric_losses', { currency })} value={formatPrice(data.metrics.lossesUsd, currency)} variant="negative" />
              <MetricCard testId="metric-net" label={t('partner.dashboard.metric_net', { currency })} value={formatPrice(data.metrics.netUsd, currency)} variant="positive" />
            </Stack>

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
      </Box>
    </Box>
  );
}
