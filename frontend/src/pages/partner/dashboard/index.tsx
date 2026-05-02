import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import { useLocale } from '../../../context/LocaleContext';
import {
  fetchPartner,
  fetchPartnerProperties,
  fetchPartnerHotelState,
  fetchPartnerPayments,
} from '../../../utils/queries';
import { formatPrice } from '../../../utils/currency';
import { currentMonth, shiftMonth, formatMonthLabel } from '../../../utils/month';
import { PROPERTY_COLORS } from '../components/RevenueTrendChart';
import { OrgMetricCard } from './ui';
import HeroBanner from './HeroBanner';
import ChartsSection from './ChartsSection';
import PropertiesSection, { type PropertyRow } from './PropertiesSection';
import MembersSection from './MembersSection';
import DisbursementsSection from './DisbursementsSection';
import type { PropertyRevenueDataPoint } from '../components/PropertyRevenueChart';

export default function MiHotelPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { language, currency } = useLocale();

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;
  const month = currentMonth();

  const partnerQuery = useQuery({
    queryKey: ['partner', partnerId],
    queryFn: () => fetchPartner(partnerId, token!),
    enabled,
  });

  const propertiesQuery = useQuery({
    queryKey: ['partner-properties', partnerId],
    queryFn: () => fetchPartnerProperties(partnerId, token!),
    enabled,
  });

  const aggregateQuery = useQuery({
    queryKey: ['partner-hotel-state', partnerId, month],
    queryFn: () => fetchPartnerHotelState(partnerId, month, null, token!),
    enabled,
  });

  const propertyQueries = useQueries({
    queries: (propertiesQuery.data?.properties ?? []).map((p) => ({
      queryKey: ['partner-hotel-state', partnerId, month, p.propertyId],
      queryFn: () => fetchPartnerHotelState(partnerId, month, null, token!, p.propertyId),
      enabled: enabled && !!propertiesQuery.data,
    })),
  });

  const paymentsQuery = useQuery({
    queryKey: ['partner-payments', partnerId, month],
    queryFn: () => fetchPartnerPayments(partnerId, month, 1, 20, token!),
    enabled,
  });

  if (!enabled) {
    return (
      <div className="max-w-[1152px] mx-auto p-8">
        <Alert severity="info">{t('partner.org_dashboard.login_required')}</Alert>
      </div>
    );
  }

  if (propertiesQuery.isLoading || aggregateQuery.isLoading) {
    return (
      <div className="flex justify-center pt-16">
        <CircularProgress />
      </div>
    );
  }

  if (propertiesQuery.isError || aggregateQuery.isError) {
    return (
      <div className="max-w-[1152px] mx-auto p-8">
        <Alert severity="error">{t('partner.org_dashboard.load_error')}</Alert>
      </div>
    );
  }

  const properties = propertiesQuery.data?.properties ?? [];
  const aggregate = aggregateQuery.data;
  const metrics = aggregate?.metrics ?? { confirmed: 0, cancelled: 0, revenueUsd: 0, lossesUsd: 0, netUsd: 0 };
  const series = aggregate?.monthlySeries ?? [];
  const payments = paymentsQuery.data;

  const currentOccupancy = (series[series.length - 1]?.occupancyRate ?? 0) * 100;
  const grossRevenue = metrics.revenueUsd;
  const commissionAmount = grossRevenue * 0.2;
  const netPayout = grossRevenue * 0.8;

  const anyPropertyLoading = propertyQueries.some((q) => q.isLoading);

  const incompleteCount = propertyQueries.filter(
    (q) => !q.isLoading && (q.data?.metrics.confirmed ?? 0) === 0,
  ).length;

  const propertyRows: PropertyRow[] = properties.map((p, i) => {
    const propData = propertyQueries[i]?.data;
    const loading = propertyQueries[i]?.isLoading ?? false;
    const propSeries = propData?.monthlySeries;
    return {
      propertyId: p.propertyId,
      propertyName: p.propertyName,
      loading,
      confirmed: propData?.metrics.confirmed ?? 0,
      gross: propData?.metrics.revenueUsd ?? 0,
      lastOccupancy: propSeries
        ? (propSeries[propSeries.length - 1]?.occupancyRate ?? 0) * 100
        : null,
    };
  });

  const barData: PropertyRevenueDataPoint[] = propertyRows.map((r) => ({
    name: r.propertyName,
    gross: Math.round(r.gross),
    commission: Math.round(r.gross * 0.2),
    net: Math.round(r.gross * 0.8),
  }));

  const trendSeries = properties
    .map((p, i) => ({
      name: p.propertyName,
      color: PROPERTY_COLORS[i % PROPERTY_COLORS.length],
      points: propertyQueries[i]?.data?.monthlySeries ?? [],
    }))
    .filter((s) => s.points.length > 0);

  const nextMonthStr = shiftMonth(month, 1);
  const disbursementLabel = formatMonthLabel(nextMonthStr, language) + ' 1';
  const totalNetPayout = payments?.rows.reduce((sum, r) => sum + r.earningsUsd, 0) ?? 0;

  const monthLabel = formatMonthLabel(month, language);

  return (
    <div className="bg-[#F5F7FA] min-h-screen">

      <HeroBanner
        orgName={partnerQuery.data?.name ?? ''}
        identifier={partnerQuery.data?.identifier ?? ''}
        userName={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || ''}
        role={user?.role ?? ''}
      />

      <div className="max-w-[1152px] mx-auto px-6 py-6 flex flex-col gap-6">

        {/* Metric row */}
        <div className="grid grid-cols-6 gap-5">
          <OrgMetricCard
            label={t('partner.org_dashboard.metric_properties')}
            value={String(properties.length)}
            subLabel={
              incompleteCount > 0
                ? t('partner.org_dashboard.metric_incomplete_count', { count: incompleteCount })
                : undefined
            }
            subColor="#854F0B"
          />
          <OrgMetricCard
            label={t('partner.org_dashboard.metric_occupancy')}
            value={`${Math.round(currentOccupancy)}%`}
          />
          <OrgMetricCard
            label={t('partner.org_dashboard.metric_active_reservations')}
            value={String(metrics.confirmed)}
          />
          <OrgMetricCard
            label={`${t('partner.org_dashboard.metric_gross')} · ${monthLabel}`}
            value={formatPrice(grossRevenue, currency)}
          />
          <OrgMetricCard
            label={t('partner.org_dashboard.metric_commission')}
            value={formatPrice(-commissionAmount, currency)}
            subLabel={t('partner.org_dashboard.commission_pct', { pct: 20 })}
          />
          <OrgMetricCard
            label={`${t('partner.org_dashboard.metric_net')} · ${monthLabel}`}
            value={formatPrice(netPayout, currency)}
            subLabel={`dispersión: ${disbursementLabel}`}
          />
        </div>

        {/* Disbursement alert */}
        {payments && payments.rows.length > 0 && (
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

        <PropertiesSection
          rows={propertyRows}
          currency={currency}
          onView={(propertyId) => navigate({ to: '/mi-hotel/$propertyId', params: { propertyId } })}
        />

        <MembersSection partnerId={partnerId} token={token!} />

        <DisbursementsSection
          payments={payments}
          month={month}
          currency={currency}
          disbursementLabel={disbursementLabel}
          totalNetPayout={totalNetPayout}
          onViewHistory={() => navigate({ to: '/mi-hotel/pagos' })}
        />

        <hr className="border-[#e2e8f0] mt-1" />
        <div className="flex justify-between text-[11px] text-gray-500 pb-1">
          <span>© 2026 TravelHub</span>
          <div className="flex gap-4">
            <a href="#" className="text-gray-500 no-underline text-[11px]">{t('footer.privacy')}</a>
            <a href="#" className="text-gray-500 no-underline text-[11px]">{t('footer.terms')}</a>
          </div>
        </div>

      </div>
    </div>
  );
}
