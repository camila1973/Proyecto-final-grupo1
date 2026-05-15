import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../context/LocaleContext';
import {
  downloadPartnerDisbursements,
  fetchPartnerDisbursements,
  type DisbursementMonth,
  type ExportFormat,
} from '../../utils/queries';
import { formatPrice } from '../../utils/currency';
import MetricCard from './components/MetricCard';
import ExportButtons from './components/ExportButtons';
import PageContainer from '../../components/PageContainer';

type PeriodMode = '12m' | 'year';

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const toY = now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const toM = now.getUTCMonth() === 11 ? 1 : now.getUTCMonth() + 2;
  const to = `${toY}-${String(toM).padStart(2, '0')}-01`;
  const fromY = now.getUTCMonth() === 11 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const fromM = now.getUTCMonth() === 11 ? 1 : now.getUTCMonth() + 2;
  const from = `${fromY}-${String(fromM).padStart(2, '0')}-01`;
  return { from, to };
}

function rangeForMode(mode: PeriodMode, year: number): { from: string; to: string } {
  if (mode === 'year') {
    return { from: `${year}-01-01`, to: `${year + 1}-01-01` };
  }
  return defaultRange();
}

const STATUS_COLOR: Record<DisbursementMonth['status'], 'success' | 'warning' | 'info' | 'error'> = {
  paid: 'success',
  pending: 'warning',
  projected: 'info',
  failed: 'error',
};

export default function DisbursementsBody() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { language, currency } = useLocale();
  const navigate = useNavigate();

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;

  const [mode, setMode] = useState<PeriodMode>('12m');
  const [year, setYear] = useState<number>(new Date().getUTCFullYear());

  const range = useMemo(() => rangeForMode(mode, year), [mode, year]);

  const historyQuery = useQuery({
    queryKey: ['partner-disbursements', partnerId, range.from, range.to],
    queryFn: () => fetchPartnerDisbursements(partnerId, range.from, range.to, token!),
    enabled,
  });

  const history = historyQuery.data;
  const months = history?.months ?? [];
  const nextPayout = months.find((m) => m.status === 'projected');

  async function downloadStatement(format: ExportFormat) {
    if (!partnerId || !token) return;
    await downloadPartnerDisbursements(partnerId, format, range.from, range.to, token, language);
  }

  if (!enabled) {
    return (
      <PageContainer>
        <Alert severity="info">{t('partner.dashboard.login_required')}</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <ToggleButtonGroup
          size="small"
          color="primary"
          exclusive
          value={mode}
          onChange={(_, v: PeriodMode | null) => v && setMode(v)}
        >
          <ToggleButton value="12m">{t('partner.finance.period.last_12_months')}</ToggleButton>
          <ToggleButton value="year">{t('partner.finance.period.year')}</ToggleButton>
        </ToggleButtonGroup>
        {mode === 'year' && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button size="small" onClick={() => setYear((y) => y - 1)}>‹</Button>
            <Typography sx={{ fontSize: 13, fontWeight: 600, minWidth: 60, textAlign: 'center' }}>{year}</Typography>
            <Button size="small" onClick={() => setYear((y) => y + 1)}>›</Button>
          </Stack>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <ExportButtons onDownload={downloadStatement} />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        <MetricCard
          label={t('partner.finance.kpi.gross_revenue')}
          value={history ? formatPrice(history.totals.gross, currency) : '—'}
          subLabel={t('partner.finance.kpi.gross_sub')}
          variant="positive"
          loading={historyQuery.isLoading}
        />
        <MetricCard
          label={t('partner.finance.kpi.commission')}
          value={history ? formatPrice(history.totals.commission, currency) : '—'}
          subLabel={t('partner.finance.kpi.commission_sub')}
          variant="negative"
          loading={historyQuery.isLoading}
        />
        <MetricCard
          label={t('partner.finance.kpi.payouts')}
          value={history ? formatPrice(history.totals.net, currency) : '—'}
          subLabel={t('partner.finance.kpi.payouts_sub')}
          variant="positive"
          loading={historyQuery.isLoading}
        />
        <MetricCard
          label={t('partner.finance.kpi.next_payout')}
          value={nextPayout ? formatPrice(nextPayout.totals.net, currency) : '—'}
          subLabel={nextPayout ? nextPayout.scheduledFor : t('partner.finance.kpi.no_projected')}
          variant="primary"
          loading={historyQuery.isLoading}
        />
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#e3e7ee' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid #eef1f5' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1a2332' }}>
            {t('partner.finance.history_title_partner')}
          </Typography>
        </Box>
        {historyQuery.isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {historyQuery.isError && (
          <Alert severity="error" sx={{ m: 2 }}>{t('partner.dashboard.load_error')}</Alert>
        )}
        {history && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f7f9fc' }}>
                  <HeaderCell>{t('partner.finance.col.period')}</HeaderCell>
                  <HeaderCell>{t('partner.finance.col.property')}</HeaderCell>
                  <HeaderCell align="right">{t('partner.finance.col.gross')}</HeaderCell>
                  <HeaderCell align="right">{t('partner.finance.col.commission')}</HeaderCell>
                  <HeaderCell align="right">{t('partner.finance.col.net')}</HeaderCell>
                  <HeaderCell>{t('partner.finance.col.date')}</HeaderCell>
                  <HeaderCell>{t('partner.finance.col.status')}</HeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {months.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, fontSize: 13, color: '#5a6a7e', fontStyle: 'italic' }}>
                      {t('partner.finance.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  months
                    .slice()
                    .reverse()
                    .flatMap((m) => {
                      const rows = m.byProperty.map((p, idx) => (
                        <TableRow
                          key={`${m.month}-${p.propertyId}`}
                          hover
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#F9FAFB' } }}
                          onClick={() =>
                            navigate({
                              to: '/mi-hotel/$propertyId',
                              params: { propertyId: p.propertyId },
                              search: { tab: 'pagos' },
                            })
                          }
                        >
                          <BodyCell sx={{ fontWeight: idx === 0 ? 600 : 400, color: idx === 0 ? '#1a2332' : '#5a6a7e' }}>
                            {idx === 0 ? m.month : ''}
                          </BodyCell>
                          <BodyCell>{p.propertyName || '—'}</BodyCell>
                          <BodyCell align="right">{formatPrice(p.gross, currency)}</BodyCell>
                          <BodyCell align="right" sx={{ color: '#c62828' }}>
                            −{formatPrice(p.commission, currency)}
                          </BodyCell>
                          <BodyCell align="right" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                            {formatPrice(p.net, currency)}
                          </BodyCell>
                          <BodyCell sx={{ fontFamily: 'monospace' }}>
                            {idx === 0 ? m.scheduledFor : ''}
                          </BodyCell>
                          <BodyCell>
                            {idx === 0 && (
                              <Chip
                                label={t(`partner.finance.status.${m.status}`)}
                                size="small"
                                color={STATUS_COLOR[m.status]}
                                variant="outlined"
                              />
                            )}
                          </BodyCell>
                        </TableRow>
                      ));
                      if (m.byProperty.length > 1) {
                        rows.push(
                          <TableRow key={`${m.month}-subtotal`} sx={{ bgcolor: '#f7f9fc' }}>
                            <BodyCell />
                            <BodyCell sx={{ fontSize: 11, color: '#5a6a7e', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>
                              {t('partner.finance.subtotal')}
                            </BodyCell>
                            <BodyCell align="right" sx={{ fontWeight: 600 }}>{formatPrice(m.totals.gross, currency)}</BodyCell>
                            <BodyCell align="right" sx={{ color: '#c62828', fontWeight: 600 }}>
                              −{formatPrice(m.totals.commission, currency)}
                            </BodyCell>
                            <BodyCell align="right" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                              {formatPrice(m.totals.net, currency)}
                            </BodyCell>
                            <BodyCell />
                            <BodyCell />
                          </TableRow>,
                        );
                      }
                      return rows;
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </PageContainer>
  );
}

function HeaderCell({ children, align }: { children?: React.ReactNode; align?: 'right' | 'left' }) {
  return (
    <TableCell
      align={align ?? 'left'}
      sx={{
        fontSize: 10.5,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: '#5a6a7e',
        fontWeight: 700,
        py: 1.25,
        bgcolor: '#f7f9fc',
      }}
    >
      {children}
    </TableCell>
  );
}

function BodyCell({
  children,
  align,
  sx,
}: {
  children?: React.ReactNode;
  align?: 'right' | 'left';
  sx?: object;
}) {
  return (
    <TableCell align={align ?? 'left'} sx={{ fontSize: 13, py: 1.5, ...sx }}>
      {children}
    </TableCell>
  );
}
