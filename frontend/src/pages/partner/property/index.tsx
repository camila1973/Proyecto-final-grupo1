import { useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Alert, Box, MenuItem, Tab, Tabs, TextField } from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import { useLocale } from '../../../context/LocaleContext';
import HeroBanner from '../sections/PropertyHeroBanner';
import PageContainer from '../../../components/PageContainer';
import {
  fetchPartnerProperty,
  fetchPartnerPropertyRooms,
  fetchPropertyMetrics,
  fetchPropertyReservations,
} from '../../../utils/queries';
import { formatPrice } from '../../../utils/currency';
import dayjs from '../../../utils/dayjs';
import { currentMonth, formatMonthLabel, shiftMonth } from '../../../utils/month';
import MetricCard from '../components/MetricCard';
import MonthSwitcher from '../components/MonthSwitcher';
import RoomCard from '../components/RoomCard';
import ChartsSection from '../sections/PropertyCharts';
import TodayMovements from '../sections/TodayMovements';
import { SectionHeader } from '../sections/ui';
import type { PropertyTabId } from './shared';
import PaymentsBody from './payments';
import ReservationsBody from './reservations';
import RoomsBody from './rooms';

const ROOM_TYPE_OPTIONS = ['', 'deluxe', 'suite', 'standard', 'junior_suite', 'penthouse'];

function todayIso(): string {
  return dayjs().format('YYYY-MM-DD');
}

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

  const roomsQuery = useQuery({
    queryKey: ['property-rooms', partnerId, propertyId],
    queryFn: () => fetchPartnerPropertyRooms(partnerId, propertyId, token!),
    enabled: enabled && tab === 'resumen',
  });

  const roomMetricsQueries = useQueries({
    queries: (roomsQuery.data?.rooms ?? []).map((r) => ({
      queryKey: ['property-metrics', partnerId, propertyId, month, r.roomType],
      queryFn: () => fetchPropertyMetrics(partnerId, propertyId, month, r.roomType, token!),
      enabled: enabled && tab === 'resumen' && !!roomsQuery.data,
    })),
  });

  const previousMonth = shiftMonth(month, -1);
  const reservationsCurrentMonth = useQuery({
    queryKey: ['property-reservations', partnerId, propertyId, month, null],
    queryFn: () => fetchPropertyReservations(partnerId, propertyId, month, null, token!),
    enabled: enabled && tab === 'resumen',
  });
  const reservationsPreviousMonth = useQuery({
    queryKey: ['property-reservations', partnerId, propertyId, previousMonth, null],
    queryFn: () => fetchPropertyReservations(partnerId, propertyId, previousMonth, null, token!),
    enabled: enabled && tab === 'resumen',
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

  const today = todayIso();
  const allReservations = [
    ...(reservationsCurrentMonth.data?.reservations ?? []),
    ...(reservationsPreviousMonth.data?.reservations ?? []),
  ];
  const checkInsToday = allReservations.filter(
    (r) => r.status === 'confirmed' && r.checkIn === today,
  );
  const checkOutsToday = allReservations.filter(
    (r) => r.status === 'checked_in' && r.checkOut === today,
  );
  const todayLoading = reservationsCurrentMonth.isLoading || reservationsPreviousMonth.isLoading;

  const roomCards = (roomsQuery.data?.rooms ?? []).map((room, i) => {
    const mq = roomMetricsQueries[i];
    return {
      roomId: room.roomId,
      roomType: room.roomType,
      bedType: room.bedType,
      capacity: room.capacity,
      totalRooms: room.totalRooms,
      basePriceUsd: room.basePriceUsd,
      occupancyRate: room.occupancyRate,
      revenueUsd: mq?.data?.metrics.revenueUsd ?? 0,
      active: room.status === 'active',
      loading: mq?.isLoading ?? false,
    };
  });

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

          <TodayMovements
            checkIns={checkInsToday}
            checkOuts={checkOutsToday}
            loading={todayLoading}
          />

          {roomCards.length > 0 && (
            <Box>
              <SectionHeader title={t('partner.dashboard.rooms_title')} />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                {roomCards.map((c) => (
                  <RoomCard
                    key={c.roomId}
                    roomId={c.roomId}
                    roomType={c.roomType}
                    bedType={c.bedType}
                    capacity={c.capacity}
                    totalRooms={c.totalRooms}
                    basePriceUsd={c.basePriceUsd}
                    occupancyRate={c.occupancyRate}
                    revenueUsd={c.revenueUsd}
                    active={c.active}
                    currency={currency}
                    loading={c.loading}
                    onClick={() =>
                      navigate({
                        to: '/mi-hotel/$propertyId/habitaciones/$roomId',
                        params: { propertyId, roomId: c.roomId },
                      })
                    }
                  />
                ))}
              </Box>
            </Box>
          )}
        </PageContainer>
      )}

      {tab === 'pagos' && <PaymentsBody />}
      {tab === 'reservas' && <ReservationsBody />}
      {tab === 'habitaciones' && <RoomsBody />}
    </div>
  );
}
