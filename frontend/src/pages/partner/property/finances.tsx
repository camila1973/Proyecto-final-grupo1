import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
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
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GridOnIcon from '@mui/icons-material/GridOn';
import { useAuth } from '../../../hooks/useAuth';
import { useLocale } from '../../../context/LocaleContext';
import {
  downloadPaymentsReportPdf,
  downloadPaymentsReportXlsx,
  fetchPartnerDisbursementHistory,
  fetchPartnerProperty,
  type DisbursementMonth,
} from '../../../utils/queries';
import { formatPrice } from '../../../utils/currency';
import PartnerHero, { HeroBreadcrumbEyebrow } from '../components/PartnerHero';
import { PropertyTabs } from '../components/PartnerTabs';
import MetricCard from '../components/MetricCard';
import PageContainer from '../../../components/PageContainer';

// Default range: last 12 months ending at the start of next month (exclusive).
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

type PeriodMode = '12m' | 'year';

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

export default function PropertyFinanzasPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { language, currency } = useLocale();
  const navigate = useNavigate();
  const { propertyId } = useParams({ from: '/mi-hotel/$propertyId/finanzas' });

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;

  const [mode, setMode] = useState<PeriodMode>('12m');
  const [year, setYear] = useState<number>(new Date().getUTCFullYear());
  const [downloading, setDownloading] = useState<'pdf' | 'xlsx' | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const range = useMemo(() => rangeForMode(mode, year), [mode, year]);

  const propertyQuery = useQuery({
    queryKey: ['partner-property', partnerId, propertyId],
    queryFn: () => fetchPartnerProperty(partnerId, propertyId, token!),
    enabled,
  });

  const historyQuery = useQuery({
    queryKey: ['property-disbursement-history', partnerId, propertyId, range.from, range.to],
    queryFn: () =>
      fetchPartnerDisbursementHistory(partnerId, range.from, range.to, token!, propertyId),
    enabled,
  });

  const property = propertyQuery.data;
  const history = historyQuery.data;
  const months = history?.months ?? [];

  // Next-month projected entry (status === 'projected') — used for the "Próximo pago" KPI.
  const nextPayout = months.find((m) => m.status === 'projected');

  async function downloadStatement(format: 'pdf' | 'xlsx') {
    if (!partnerId || !token) return;
    setDownloading(format);
    setDownloadError(null);
    try {
      const fn = format === 'pdf' ? downloadPaymentsReportPdf : downloadPaymentsReportXlsx;
      await fn(partnerId, range.from, range.to, token, propertyId, language);
    } catch (e) {
      setDownloadError(t('partner.finance.action.download_failed'));
      console.error(e);
    } finally {
      setDownloading(null);
    }
  }

  async function downloadMonthPdf(month: DisbursementMonth) {
    if (!partnerId || !token) return;
    setDownloading('pdf');
    setDownloadError(null);
    try {
      await downloadPaymentsReportPdf(
        partnerId,
        month.periodStart,
        month.periodEnd,
        token,
        propertyId,
        language,
      );
    } catch (e) {
      setDownloadError(t('partner.finance.action.download_failed'));
      console.error(e);
    } finally {
      setDownloading(null);
    }
  }

  if (!enabled) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info">{t('partner.dashboard.login_required')}</Alert>
      </Box>
    );
  }

  return (
    <Box className="bg-[#f1f4f8] min-h-screen">
      <PartnerHero
        eyebrow={
          <HeroBreadcrumbEyebrow
            items={[
              { label: property?.propertyName ?? propertyId, clickable: true },
              { label: t('partner.finance.crumb_finance') },
            ]}
            onItemClick={(i) => {
              if (i === 0) navigate({ to: '/mi-hotel/$propertyId', params: { propertyId } });
            }}
          />
        }
        title={t('partner.finance.title_property')}
        subtitle={
          property
            ? `${property.propertyCity ?? ''} · ${property.propertyCountryCode ?? ''}`.replace(/^ · | · $/g, '')
            : undefined
        }
        actions={
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon fontSize="small" />}
            disabled={downloading !== null}
            onClick={() => downloadStatement('pdf')}
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)', textTransform: 'none' }}
          >
            {t('partner.finance.action.download_statement')}
          </Button>
        }
      />
      <PropertyTabs propertyId={propertyId} active="finanzas" />

      <PageContainer>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant={mode === '12m' ? 'contained' : 'outlined'}
            onClick={() => setMode('12m')}
            sx={mode === '12m' ? { bgcolor: '#1B4F8C', textTransform: 'none' } : { textTransform: 'none' }}
          >
            {t('partner.finance.period.last_12_months')}
          </Button>
          <Button
            size="small"
            variant={mode === 'year' ? 'contained' : 'outlined'}
            onClick={() => setMode('year')}
            sx={mode === 'year' ? { bgcolor: '#1B4F8C', textTransform: 'none' } : { textTransform: 'none' }}
          >
            {t('partner.finance.period.year')}
          </Button>
          {mode === 'year' && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button size="small" onClick={() => setYear((y) => y - 1)}>‹</Button>
              <Typography sx={{ fontSize: 13, fontWeight: 600, minWidth: 60, textAlign: 'center' }}>{year}</Typography>
              <Button size="small" onClick={() => setYear((y) => y + 1)}>›</Button>
            </Stack>
          )}
        </Stack>

        {/* KPI strip */}
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

        {downloadError && (
          <Alert severity="error" onClose={() => setDownloadError(null)}>
            {downloadError}
          </Alert>
        )}

        {/* History table */}
        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#e3e7ee' }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid #eef1f5' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1a2332' }}>
              {t('partner.finance.history_title')}
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
                    <HeaderCell align="right">{t('partner.finance.col.gross')}</HeaderCell>
                    <HeaderCell align="right">{t('partner.finance.col.commission')}</HeaderCell>
                    <HeaderCell align="right">{t('partner.finance.col.net')}</HeaderCell>
                    <HeaderCell>{t('partner.finance.col.date')}</HeaderCell>
                    <HeaderCell>{t('partner.finance.col.status')}</HeaderCell>
                    <HeaderCell align="right" />
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
                      .reverse() // newest first in display
                      .map((m) => (
                        <TableRow
                          key={m.month}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() =>
                            navigate({
                              to: '/mi-hotel/$propertyId/pagos',
                              params: { propertyId },
                            })
                          }
                        >
                          <BodyCell sx={{ fontWeight: 600 }}>{m.month}</BodyCell>
                          <BodyCell align="right">{formatPrice(m.totals.gross, currency)}</BodyCell>
                          <BodyCell align="right" sx={{ color: '#c62828' }}>
                            −{formatPrice(m.totals.commission, currency)}
                          </BodyCell>
                          <BodyCell align="right" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                            {formatPrice(m.totals.net, currency)}
                          </BodyCell>
                          <BodyCell sx={{ fontFamily: 'monospace' }}>{m.scheduledFor}</BodyCell>
                          <BodyCell>
                            <Chip
                              label={t(`partner.finance.status.${m.status}`)}
                              size="small"
                              color={STATUS_COLOR[m.status]}
                              variant="outlined"
                            />
                          </BodyCell>
                          <BodyCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Button
                                size="small"
                                variant="text"
                                startIcon={<PictureAsPdfIcon fontSize="small" />}
                                disabled={downloading !== null}
                                onClick={() => downloadMonthPdf(m)}
                                sx={{ textTransform: 'none', minWidth: 0, color: '#1e4a89' }}
                              >
                                PDF
                              </Button>
                            </Stack>
                          </BodyCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Secondary actions */}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            size="small"
            variant="outlined"
            startIcon={<GridOnIcon fontSize="small" />}
            disabled={downloading !== null}
            onClick={() => downloadStatement('xlsx')}
            sx={{ textTransform: 'none' }}
          >
            {t('partner.payments.report.export_xlsx')}
          </Button>
        </Stack>
      </PageContainer>
    </Box>
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
  onClick,
}: {
  children?: React.ReactNode;
  align?: 'right' | 'left';
  sx?: object;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <TableCell align={align ?? 'left'} onClick={onClick} sx={{ fontSize: 13, py: 1.5, ...sx }}>
      {children}
    </TableCell>
  );
}
