import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Alert, Box, CircularProgress, Tab, Tabs } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../context/LocaleContext';
import {
  fetchPartner,
  fetchPartnerProperties,
  fetchPartnerMetrics,
  fetchPropertyMetrics,
  fetchPartnerDisbursements,
} from '../../utils/queries';
import { formatPrice } from '../../utils/currency';
import { currentMonth, monthRange, shiftMonth, formatMonthLabel } from '../../utils/month';
import { PROPERTY_COLORS } from './components/RevenueTrendChart';
import MetricCard from './components/MetricCard';
import MonthSwitcher from './components/MonthSwitcher';
import HeroBanner from './sections/PartnerHeroBanner';
import PageContainer from '../../components/PageContainer';
import ChartsSection from './sections/OverviewCharts';
import DisbursementsSection from './sections/DisbursementsPreview';
import type { PropertyRevenueDataPoint } from './components/PropertyRevenueChart';
import type { PartnerTabId } from './shared';
import DisbursementsBody from './disbursements';
import PropertiesBody from './properties';
import TeamBody from './team';

export default function MiHotelPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { language, currency } = useLocale();
  const { tab } = useSearch({ from: '/mi-hotel' });

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;
  const [month, setMonth] = useState(currentMonth());

  const setTab = (next: PartnerTabId) =>
    navigate({ to: '/mi-hotel', search: { tab: next }, replace: true });

  const partnerQuery = useQuery({
    queryKey: ['partner', partnerId],
    queryFn: () => fetchPartner(partnerId, token!),
    enabled,
  });

  const propertiesQuery = useQuery({
    queryKey: ['partner-properties', partnerId],
    queryFn: () => fetchPartnerProperties(partnerId, token!),
    enabled: enabled && tab === 'resumen',
  });

  const aggregateQuery = useQuery({
    queryKey: ['partner-metrics', partnerId, month],
    queryFn: () => fetchPartnerMetrics(partnerId, month, null, token!),
    enabled: enabled && tab === 'resumen',
  });

  const propertyQueries = useQueries({
    queries: (propertiesQuery.data?.properties ?? []).map((p) => ({
      queryKey: ['property-metrics', partnerId, p.propertyId, month],
      queryFn: () => fetchPropertyMetrics(partnerId, p.propertyId, month, null, token!),
      enabled: enabled && tab === 'resumen' && !!propertiesQuery.data,
    })),
  });

  const disbursementRange = monthRange(month);
  const disbursementQuery = useQuery({
    queryKey: ['partner-disbursements', partnerId, disbursementRange.from, disbursementRange.to],
    queryFn: () =>
      fetchPartnerDisbursements(partnerId, disbursementRange.from, disbursementRange.to, token!),
    enabled: enabled && tab === 'resumen',
  });

  if (!enabled) {
    return (
      <PageContainer>
        <Alert severity="info">{t('partner.org_dashboard.login_required')}</Alert>
      </PageContainer>
    );
  }

  const partner = partnerQuery.data;
  const isResumenLoading = tab === 'resumen' && (propertiesQuery.isLoading || aggregateQuery.isLoading);
  const isResumenError = tab === 'resumen' && (propertiesQuery.isError || aggregateQuery.isError);

  const properties = propertiesQuery.data?.properties ?? [];
  const aggregate = aggregateQuery.data;
  const metrics = aggregate?.metrics ?? { confirmed: 0, cancelled: 0, revenueUsd: 0, lossesUsd: 0, netUsd: 0 };
  const series = aggregate?.monthlySeries ?? [];
  const disbursement = disbursementQuery.data?.months[0] ?? null;

  const currentOccupancy = (series[series.length - 1]?.occupancyRate ?? 0) * 100;
  const grossRevenue = metrics.revenueUsd;
  const anyPropertyLoading = propertyQueries.some((q) => q.isLoading);
  const incompleteCount = propertyQueries.filter(
    (q) => !q.isLoading && (q.data?.metrics.confirmed ?? 0) === 0,
  ).length;

  const barData: PropertyRevenueDataPoint[] = properties.map((p, i) => {
    const gross = propertyQueries[i]?.data?.metrics.revenueUsd ?? 0;
    return {
      name: p.propertyName,
      gross: Math.round(gross),
      commission: Math.round(gross * 0.2),
      net: Math.round(gross * 0.8),
    };
  });

  const trendSeries = properties
    .map((p, i) => ({
      name: p.propertyName,
      color: PROPERTY_COLORS[i % PROPERTY_COLORS.length],
      points: propertyQueries[i]?.data?.monthlySeries ?? [],
    }))
    .filter((s) => s.points.length > 0);

  const nextMonthStr = shiftMonth(month, 1);
  const disbursementLabel = formatMonthLabel(nextMonthStr, language) + ' 1';

  const disbursementRows = (disbursement?.byProperty ?? []).map((r) => ({
    propertyId: r.propertyId,
    propertyName: r.propertyName,
    gross: r.gross,
    commission: r.commission,
    taxes: r.tax,
    net: r.net,
  }));
  const totalNetPayout = disbursement?.totals.net ?? 0;
  const totalCommission = disbursement?.totals.commission ?? 0;
  const topProperty = disbursementRows[0];
  const disbursementStatus = disbursement?.status ?? 'projected';

  const monthLabel = formatMonthLabel(month, language);

  return (
    <div className="min-h-screen">
      <HeroBanner
        orgName={partner?.name ?? ''}
        identifier={partner?.identifier ?? ''}
        userName={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || ''}
        role={user?.role ?? ''}
      />
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: 3 }}>
        <Box sx={{ maxWidth: 1152, mx: 'auto' }}>
          <Tabs
            value={tab}
            onChange={(_, v: PartnerTabId) => setTab(v)}
            sx={{ '& .MuiTab-root': { textTransform: 'uppercase', fontSize: 13, fontWeight: 600, letterSpacing: 0.3 } }}
          >
            <Tab value="resumen" label={t('partner.tabs.resumen')} />
            <Tab value="desembolsos" label={t('partner.tabs.desembolsos')} />
            <Tab value="propiedades" label={t('partner.tabs.propiedades')} />
            <Tab value="equipo" label={t('partner.tabs.equipo')} />
          </Tabs>
        </Box>
      </Box>

      {tab === 'resumen' && isResumenLoading && (
        <div className="flex justify-center pt-16">
          <CircularProgress />
        </div>
      )}

      {tab === 'resumen' && !isResumenLoading && isResumenError && (
        <PageContainer>
          <Alert severity="error">{t('partner.org_dashboard.load_error')}</Alert>
        </PageContainer>
      )}

      {tab === 'resumen' && !isResumenLoading && !isResumenError && (
        <PageContainer>
          <div className="flex justify-end">
            <MonthSwitcher month={month} onChange={setMonth} language={language} />
          </div>

          <div className="grid grid-cols-6 gap-5">
            <MetricCard
              label={t('partner.org_dashboard.metric_properties')}
              value={String(properties.length)}
              subLabel={
                incompleteCount > 0
                  ? t('partner.org_dashboard.metric_incomplete_count', { count: incompleteCount })
                  : undefined
              }
              subColor="#854F0B"
            />
            <MetricCard
              label={t('partner.org_dashboard.metric_occupancy')}
              value={`${Math.round(currentOccupancy)}%`}
            />
            <MetricCard
              label={t('partner.org_dashboard.metric_active_reservations')}
              value={String(metrics.confirmed)}
            />
            <MetricCard
              label={`${t('partner.org_dashboard.metric_gross')} · ${monthLabel}`}
              value={formatPrice(grossRevenue, currency)}
            />
            <MetricCard
              label={t('partner.org_dashboard.metric_top_property')}
              value={topProperty?.propertyName || '—'}
              subLabel={
                topProperty
                  ? formatPrice(topProperty.net, currency)
                  : t('partner.org_dashboard.metric_top_property_empty')
              }
            />
            <MetricCard
              label={`${t('partner.org_dashboard.metric_net')} · ${monthLabel}`}
              value={formatPrice(totalNetPayout, currency)}
              subLabel={t('partner.org_dashboard.metric_net_sublabel', {
                commission: formatPrice(-totalCommission, currency),
                date: disbursementLabel,
              })}
            />
          </div>

          {disbursementRows.length > 0 && (
            <div className="bg-[#E8EFF7] border border-[#85B7EB] rounded-lg px-4 py-2.5 flex items-center gap-3 text-[#0C447C]">
              <span className="shrink-0">ℹ</span>
              <span className="text-xs">
                {t('partner.org_dashboard.alert_disbursement', {
                  amount: formatPrice(totalNetPayout, currency),
                  date: disbursementLabel,
                })}{' '}
                <a href="#disbursements" className="font-medium cursor-pointer text-[#0C447C]">
                  {t('partner.org_dashboard.alert_see_detail')}
                </a>
              </span>
            </div>
          )}

          <ChartsSection
            barData={barData}
            trendSeries={trendSeries}
            anyPropertyLoading={anyPropertyLoading}
            monthLabel={monthLabel}
          />

          <DisbursementsSection
            rows={disbursementRows}
            month={month}
            currency={currency}
            disbursementLabel={disbursementLabel}
            totalNetPayout={totalNetPayout}
            status={disbursementStatus}
            onViewHistory={() => navigate({ to: '/mi-hotel', search: { tab: 'desembolsos' } })}
          />
        </PageContainer>
      )}

      {tab === 'desembolsos' && <DisbursementsBody />}
      {tab === 'propiedades' && <PropertiesBody />}
      {tab === 'equipo' && <TeamBody />}
    </div>
  );
}
