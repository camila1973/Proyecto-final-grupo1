import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
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
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../context/LocaleContext';
import { fetchPartnerPayments } from '../../utils/queries';
import { formatPrice } from '../../utils/currency';

const PAGE_SIZE = 20;

export default function PagosPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { currency } = useLocale();

  const [filter, setFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const partnerId = user?.id ?? '';
  const enabled = !!token && !!partnerId;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['partner-payments', partnerId, page],
    queryFn: () => fetchPartnerPayments(partnerId, null, page, PAGE_SIZE, token!),
    enabled,
  });

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter(
      (r) =>
        r.reservationId.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q),
    );
  }, [data, filter]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  if (!enabled) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
        <Alert severity="info">{t('partner.dashboard.login_required')}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
          {t('partner.payments.title')}
        </Typography>

        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder={t('partner.payments.search_placeholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            slotProps={{ input: { endAdornment: <SearchIcon fontSize="small" /> } }}
            sx={{ width: 280 }}
          />
          <Stack direction="row" spacing={1}>
            <IconButton
              aria-label={t('partner.dashboard.prev_page')}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              sx={{ bgcolor: '#3b5998', color: '#fff', '&:hover': { bgcolor: '#2d4373' } }}
            >
              <ArrowBackIcon />
            </IconButton>
            <IconButton
              aria-label={t('partner.dashboard.next_page')}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              sx={{ bgcolor: '#3b5998', color: '#fff', '&:hover': { bgcolor: '#2d4373' } }}
            >
              <ArrowForwardIcon />
            </IconButton>
          </Stack>
        </Stack>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {isError && <Alert severity="error">{t('partner.dashboard.load_error')}</Alert>}

        {data && (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#dde6f8' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('partner.payments.col_reservation')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('partner.payments.col_status')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('partner.payments.col_method')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('partner.payments.col_reference')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('partner.payments.col_nights')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('partner.payments.col_rate')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('partner.payments.col_subtotal')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('partner.payments.col_taxes')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('partner.payments.col_total')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('partner.payments.col_commission')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('partner.payments.col_earnings')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 3, color: '#6b7280' }}>
                      {t('partner.payments.no_payments')}
                    </TableCell>
                  </TableRow>
                ) : filteredRows.map((r) => (
                  <TableRow key={r.reservationId}>
                    <TableCell>{r.reservationId.slice(0, 8)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{r.status.toUpperCase()}</TableCell>
                    <TableCell>{r.paymentMethod}</TableCell>
                    <TableCell>{r.reference}</TableCell>
                    <TableCell>{r.nights}</TableCell>
                    <TableCell>{formatPrice(r.ratePerNightUsd, currency)}</TableCell>
                    <TableCell>{formatPrice(r.subtotalUsd, currency)}</TableCell>
                    <TableCell>{formatPrice(r.taxesUsd, currency)}</TableCell>
                    <TableCell>{formatPrice(r.totalPaidUsd, currency)}</TableCell>
                    <TableCell sx={{ color: '#e74c3c' }}>{formatPrice(r.commissionUsd, currency)}</TableCell>
                    <TableCell sx={{ color: '#27ae60', fontWeight: 700 }}>
                      {formatPrice(r.earningsUsd, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}
