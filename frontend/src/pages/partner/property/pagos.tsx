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
import { fetchPartnerPayments } from '../../../utils/queries';
import { formatPrice } from '../../../utils/currency';
import { TH, TD } from '../dashboard/ui';

const PAGE_SIZE = 20;

const NAV_BTN = { bgcolor: '#1B4F8C', color: '#fff', '&:hover': { bgcolor: '#163d6e' } } as const;

export default function PagosPropertyPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { currency } = useLocale();
  const navigate = useNavigate();
  const { propertyId } = useParams({ from: '/mi-hotel/$propertyId/pagos' });

  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['partner-payments', partnerId, page, propertyId],
    queryFn: () => fetchPartnerPayments(partnerId, null, page, PAGE_SIZE, token!, propertyId),
    enabled,
  });

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter(
      (r) => r.reservationId.toLowerCase().includes(q) || r.reference.toLowerCase().includes(q),
    );
  }, [data, filter]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  if (!enabled) {
    return (
      <Box sx={{ maxWidth: 1152, mx: 'auto', p: 4 }}>
        <Alert severity="info">{t('partner.dashboard.login_required')}</Alert>
      </Box>
    );
  }

  return (
    <Box className="bg-[#F5F7FA] min-h-screen">
      <Box sx={{ maxWidth: 1152, mx: 'auto', px: 3, py: 4 }}>
        <Button
          variant="text"
          sx={{ mb: 1, p: 0, minWidth: 0, fontSize: 12, color: '#1B4F8C' }}
          onClick={() => navigate({ to: '/mi-hotel/$propertyId', params: { propertyId } })}
        >
          {t('partner.properties.back')}
        </Button>

        <Typography sx={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', mb: 3 }}>
          {t('partner.payments.title')}
        </Typography>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder={t('partner.payments.search_placeholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            slotProps={{ input: { endAdornment: <SearchIcon fontSize="small" sx={{ color: '#9ca3af' }} /> } }}
            sx={{ width: 260, '& .MuiOutlinedInput-root': { fontSize: 12, borderRadius: 1.5 } }}
          />
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" aria-label={t('partner.dashboard.prev_page')} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} sx={NAV_BTN}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label={t('partner.dashboard.next_page')} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} sx={NAV_BTN}>
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={24} /></Box>}
        {isError && <Alert severity="error">{t('partner.dashboard.load_error')}</Alert>}

        {data && (
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TH>{t('partner.payments.col_reservation')}</TH>
                    <TH>{t('partner.payments.col_status')}</TH>
                    <TH>{t('partner.payments.col_method')}</TH>
                    <TH>{t('partner.payments.col_reference')}</TH>
                    <TH>{t('partner.payments.col_nights')}</TH>
                    <TH align="right">{t('partner.payments.col_rate')}</TH>
                    <TH align="right">{t('partner.payments.col_subtotal')}</TH>
                    <TH align="right">{t('partner.payments.col_taxes')}</TH>
                    <TH align="right">{t('partner.payments.col_total')}</TH>
                    <TH align="right">{t('partner.payments.col_commission')}</TH>
                    <TH align="right">{t('partner.payments.col_earnings')}</TH>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 3, fontSize: 12, color: '#6b7280' }}>
                        {t('partner.payments.no_payments')}
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.map((r) => (
                    <TableRow key={r.reservationId} sx={{ '&:hover': { bgcolor: '#F9FAFB' } }}>
                      <TD sx={{ fontFamily: 'monospace', color: '#4a5568' }}>{r.reservationId.slice(0, 8)}</TD>
                      <TD>{r.status.toUpperCase()}</TD>
                      <TD>{r.paymentMethod}</TD>
                      <TD>{r.reference}</TD>
                      <TD>{r.nights}</TD>
                      <TD align="right">{formatPrice(r.ratePerNightUsd, currency)}</TD>
                      <TD align="right">{formatPrice(r.subtotalUsd, currency)}</TD>
                      <TD align="right">{formatPrice(r.taxesUsd, currency)}</TD>
                      <TD align="right">{formatPrice(r.totalPaidUsd, currency)}</TD>
                      <TD align="right" sx={{ color: '#A32D2D' }}>{formatPrice(r.commissionUsd, currency)}</TD>
                      <TD align="right" sx={{ color: '#3B6D11', fontWeight: 500 }}>{formatPrice(r.earningsUsd, currency)}</TD>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
