import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../context/LocaleContext';
import { fetchPartnerHotelState } from '../../utils/queries';
import { formatPrice } from '../../utils/currency';
import { currentMonth, formatMonthLabel, shiftMonth } from '../../utils/month';
import MetricCard from './MetricCard';
import MonthlyChart from './MonthlyChart';

const PAGE_SIZE = 10;
const ROOM_TYPE_OPTIONS = ['', 'Doble Superior', 'Suite', 'Sencilla', 'Familiar'];

export default function MiHotelPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { language, currency } = useLocale();
  const navigate = useNavigate();

  const [month, setMonth] = useState<string>(currentMonth());
  const [roomType, setRoomType] = useState<string>('');
  const [reservationFilter, setReservationFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const partnerId = user?.id ?? '';
  const enabled = !!token && !!partnerId;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['partner-hotel-state', partnerId, month, roomType],
    queryFn: () => fetchPartnerHotelState(partnerId, month, roomType || null, token!),
    enabled,
  });

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
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
        <Alert severity="info">{t('partner.dashboard.login_required')}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ bgcolor: '#3b5998', color: '#fff', px: 4, py: 5 }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {t('partner.dashboard.hotel_name')}
            </Typography>
            <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
              {t('partner.dashboard.hotel_address')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            sx={{ bgcolor: '#f6d669', color: '#000', '&:hover': { bgcolor: '#e8c84d' } }}
          >
            {t('partner.dashboard.edit')}
          </Button>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {t('partner.dashboard.state_title')}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ minWidth: 110, textAlign: 'right' }}>
              {formatMonthLabel(month, language)}
            </Typography>
            <IconButton
              aria-label={t('partner.dashboard.prev_month')}
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              sx={{ bgcolor: '#3b5998', color: '#fff', '&:hover': { bgcolor: '#2d4373' } }}
            >
              <ArrowBackIcon />
            </IconButton>
            <IconButton
              aria-label={t('partner.dashboard.next_month')}
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              sx={{ bgcolor: '#3b5998', color: '#fff', '&:hover': { bgcolor: '#2d4373' } }}
            >
              <ArrowForwardIcon />
            </IconButton>
          </Stack>
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <TextField
            select
            size="small"
            label={t('partner.dashboard.room_type_filter')}
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            {ROOM_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt || 'all'} value={opt}>
                {opt || t('partner.dashboard.all_room_types')}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {isError && <Alert severity="error">{t('partner.dashboard.load_error')}</Alert>}

        {data && (
          <>
            <MonthlyChart data={data.monthlySeries} />

            <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }} useFlexGap>
              <MetricCard
                testId="metric-confirmed"
                label={t('partner.dashboard.metric_confirmed')}
                value={String(data.metrics.confirmed)}
              />
              <MetricCard
                testId="metric-cancelled"
                label={t('partner.dashboard.metric_cancelled')}
                value={String(data.metrics.cancelled)}
              />
              <MetricCard
                testId="metric-revenue"
                label={t('partner.dashboard.metric_revenue', { currency })}
                value={formatPrice(data.metrics.revenueUsd, currency)}
                variant="positive"
              />
              <MetricCard
                testId="metric-losses"
                label={t('partner.dashboard.metric_losses', { currency })}
                value={formatPrice(data.metrics.lossesUsd, currency)}
                variant="negative"
              />
              <MetricCard
                testId="metric-net"
                label={t('partner.dashboard.metric_net', { currency })}
                value={formatPrice(data.metrics.netUsd, currency)}
                variant="positive"
              />
            </Stack>

            <Box sx={{ mb: 3 }}>
              <Button
                variant="text"
                onClick={() => navigate({ to: '/mi-hotel/pagos' })}
                sx={{ textDecoration: 'underline', fontWeight: 700 }}
              >
                {t('partner.dashboard.see_all_payments')}
              </Button>
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
              {t('partner.dashboard.reservations_title')}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                size="small"
                placeholder={t('partner.dashboard.reservation_search_placeholder')}
                value={reservationFilter}
                onChange={(e) => {
                  setReservationFilter(e.target.value);
                  setPage(1);
                }}
                slotProps={{ input: { endAdornment: <SearchIcon fontSize="small" /> } }}
                sx={{ width: 280 }}
              />
            </Stack>

            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#dde6f8' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t('partner.dashboard.col_reservation')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('partner.dashboard.col_status')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('partner.dashboard.col_name')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('partner.dashboard.col_email')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('partner.dashboard.col_phone')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('partner.dashboard.col_guests')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('partner.dashboard.col_check_in')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('partner.dashboard.col_check_out')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('partner.dashboard.col_room')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 3, color: '#6b7280' }}>
                        {t('partner.dashboard.no_reservations')}
                      </TableCell>
                    </TableRow>
                  ) : pageRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.id.slice(0, 8)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{r.status.toUpperCase()}</TableCell>
                      <TableCell>{r.guestName}</TableCell>
                      <TableCell>{r.guestEmail}</TableCell>
                      <TableCell>{r.guestPhone}</TableCell>
                      <TableCell>{r.guestCount}</TableCell>
                      <TableCell>{r.checkIn}</TableCell>
                      <TableCell>{r.checkOut}</TableCell>
                      <TableCell>{r.roomType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <IconButton
                aria-label={t('partner.dashboard.prev_page')}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                sx={{ bgcolor: '#3b5998', color: '#fff', '&:hover': { bgcolor: '#2d4373' } }}
              >
                <ArrowBackIcon />
              </IconButton>
              <IconButton
                aria-label={t('partner.dashboard.next_page')}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                sx={{ bgcolor: '#3b5998', color: '#fff', '&:hover': { bgcolor: '#2d4373' } }}
              >
                <ArrowForwardIcon />
              </IconButton>
            </Stack>
          </>
        )}
      </Box>
    </Box>
  );
}
