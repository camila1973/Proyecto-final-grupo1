import { useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, MenuItem, Tab, Tabs, TextField } from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import { useLocale } from '../../../context/LocaleContext';
import HeroBanner from '../sections/PropertyHeroBanner';
import PageContainer from '../../../components/PageContainer';
import {
  fetchPartnerProperty,
  fetchPropertyMetrics,
} from '../../../utils/queries';
import { formatPrice } from '../../../utils/currency';
import { currentMonth, formatMonthLabel } from '../../../utils/month';
import MetricCard from '../components/MetricCard';
import MonthSwitcher from '../components/MonthSwitcher';
import ChartsSection from '../sections/PropertyCharts';
import type { PropertyTabId } from './shared';
import PaymentsBody from './payments';
import ReservationsBody from './reservations';
import RoomsBody from './rooms';

const ROOM_TYPE_OPTIONS = ['', 'deluxe', 'suite', 'standard', 'junior_suite', 'penthouse'];

export default function PropertyDashboardPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { language, currency } = useLocale();
  const navigate = useNavigate();
  const { propertyId } = useParams({ from: '/mi-hotel/$propertyId' });
  const { tab } = useSearch({ from: '/mi-hotel/$propertyId' });

  const [month, setMonth] = useState(currentMonth());
  const [roomType, setRoomType] = useState('');

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;

  const setTab = (next: PropertyTabId) =>
    navigate({
      to: '/mi-hotel/$propertyId',
      params: { propertyId },
      search: { tab: next },
      replace: true,
    });

  const metricsQuery = useQuery({
    queryKey: ['property-metrics', partnerId, propertyId, month, roomType],
    queryFn: () => fetchPropertyMetrics(partnerId, propertyId, month, roomType || null, token!),
    enabled: enabled && tab === 'resumen',
  });

  const propertyQuery = useQuery({
    queryKey: ['partner-property', partnerId, propertyId],
    queryFn: () => fetchPartnerProperty(partnerId, propertyId, token!),
    enabled,
  });

  if (!enabled) {
    return (
      <PageContainer>
        <Alert severity="info">{t('partner.dashboard.login_required')}</Alert>
      </PageContainer>
    );
  }

  const propertyName = propertyQuery.data?.propertyName ?? propertyId;
  const propertyAddress = [
    propertyQuery.data?.propertyNeighborhood,
    propertyQuery.data?.propertyCity,
    propertyQuery.data?.propertyCountryCode,
  ].filter(Boolean).join(', ');

  const isResumenError = tab === 'resumen' && metricsQuery.isError;
  const isResumenLoading = tab === 'resumen' && metricsQuery.isLoading;

  return (
    <div className="min-h-screen">
      <HeroBanner
        propertyName={propertyName}
        propertyId={propertyId}
        address={propertyAddress}
      />
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: 3 }}>
        <Box sx={{ maxWidth: 1152, mx: 'auto' }}>
          <Tabs
            value={tab}
            onChange={(_, v: PropertyTabId) => setTab(v)}
            sx={{ '& .MuiTab-root': { textTransform: 'uppercase', fontSize: 13, fontWeight: 600, letterSpacing: 0.3 } }}
          >
            <Tab value="resumen" label={t('partner.tabs.resumen')} />
            <Tab value="pagos" label={t('partner.tabs.pagos')} />
            <Tab value="reservas" label={t('partner.tabs.reservas')} />
            <Tab value="habitaciones" label={t('partner.tabs.habitaciones')} />
          </Tabs>
        </Box>
      </Box>

      {tab === 'resumen' && isResumenError && (
        <PageContainer>
          <Alert severity="error">{t('partner.dashboard.load_error')}</Alert>
        </PageContainer>
      )}

      {tab === 'resumen' && !isResumenError && (
        <PageContainer>
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
            <MetricCard loading={isResumenLoading} testId="metric-confirmed" label={t('partner.dashboard.metric_confirmed')} value={String(metricsQuery.data?.metrics.confirmed ?? 0)} />
            <MetricCard loading={isResumenLoading} testId="metric-cancelled" label={t('partner.dashboard.metric_cancelled')} value={String(metricsQuery.data?.metrics.cancelled ?? 0)} />
            <MetricCard loading={isResumenLoading} testId="metric-revenue" label={t('partner.dashboard.metric_revenue', { currency })} value={formatPrice(metricsQuery.data?.metrics.revenueUsd ?? 0, currency)} variant="positive" />
            <MetricCard loading={isResumenLoading} testId="metric-losses" label={t('partner.dashboard.metric_losses', { currency })} value={formatPrice(metricsQuery.data?.metrics.lossesUsd ?? 0, currency)} variant="negative" />
            <MetricCard loading={isResumenLoading} testId="metric-net" label={t('partner.dashboard.metric_net', { currency })} value={formatPrice(metricsQuery.data?.metrics.netUsd ?? 0, currency)} variant="positive" />
          </div>

          <ChartsSection
            propertyName={propertyName}
            monthlySeries={metricsQuery.data?.monthlySeries ?? []}
            grossRevenue={metricsQuery.data?.metrics.revenueUsd ?? 0}
            loading={isResumenLoading}
            monthLabel={formatMonthLabel(month, language)}
          />
        </PageContainer>
      )}

      {tab === 'pagos' && <PaymentsBody />}
      {tab === 'reservas' && <ReservationsBody />}
      {tab === 'habitaciones' && <RoomsBody />}
    </div>
  );
}
