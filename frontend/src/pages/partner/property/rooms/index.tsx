import { useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useAuth } from '../../../../hooks/useAuth';
import { useLocale } from '../../../../context/LocaleContext';
import {
  fetchPartnerRoomById,
  fetchPartnerRoomAvailability,
  fetchPartnerRoomRates,
  fetchPropertyReservations,
  blockPartnerRoomDates,
  unblockPartnerRoomDates,
  createPartnerRoomRate,
  updatePartnerRoomRate,
  deletePartnerRoomRate,
} from '../../../../utils/queries';
import { currentMonth, shiftMonth } from '../../../../utils/month';
import { formatPrice } from '../../../../utils/currency';
import dayjs from '../../../../utils/dayjs';
import RoomHeroBanner from './RoomHeroBanner';
import RoomKpiStrip from './RoomKpiStrip';
import RoomCalendar from './RoomCalendar';
import { buildCalendarDays } from './calendarDays';
import RoomEditDrawer, { type DrawerMode } from './RoomEditDrawer';
import RatePlanCard from './RatePlanCard';
import BlocksCard from './BlocksCard';
import UpcomingReservationsCard from './UpcomingReservationsCard';
import { computeOccupancy } from './roomMetrics';
import { selectUpcoming } from './upcomingReservations';
import { groupBlockedRuns, type BlockedRange } from './blockRanges';
import { formatRatePeriodRange, type RatePlanRow } from './roomRatePlan';
import PageContainer from '../../../../components/PageContainer';

function monthWindow(month: string): { fromDate: string; toDate: string } {
  const start = dayjs.utc(`${month}-01`);
  return {
    fromDate: start.format('YYYY-MM-DD'),
    toDate: start.add(1, 'month').format('YYYY-MM-DD'),
  };
}

function addDays(date: string, n: number): string {
  return dayjs.utc(date).add(n, 'day').format('YYYY-MM-DD');
}

function todayIso(): string {
  return dayjs().format('YYYY-MM-DD');
}

export default function RoomDetailPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { language, currency } = useLocale();
  const { propertyId, roomId } = useParams({ from: '/mi-hotel/$propertyId/rooms/$roomId' });
  const queryClient = useQueryClient();

  const [month, setMonth] = useState(currentMonth());
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [hovDate, setHovDate] = useState<string | null>(null);
  const [hintMode, setHintMode] = useState<'idle' | 'selecting'>('idle');
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editingInitialPrice, setEditingInitialPrice] = useState<number | undefined>(undefined);

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;
  const { fromDate, toDate } = monthWindow(month);

  const roomQuery = useQuery({
    queryKey: ['partner-room', partnerId, propertyId, roomId],
    queryFn: () => fetchPartnerRoomById(partnerId, propertyId, roomId, token!),
    enabled,
  });

  const availQuery = useQuery({
    queryKey: ['room-availability', partnerId, propertyId, roomId, month],
    queryFn: () => fetchPartnerRoomAvailability(partnerId, propertyId, roomId, fromDate, toDate, token!),
    enabled,
  });

  const ratesQuery = useQuery({
    queryKey: ['room-rates', partnerId, propertyId, roomId, month],
    queryFn: () => fetchPartnerRoomRates(partnerId, propertyId, roomId, fromDate, toDate, token!),
    enabled,
  });

  const upcomingQuery = useQuery({
    queryKey: ['property-reservations-room', partnerId, propertyId, roomQuery.data?.roomType ?? null],
    queryFn: () => fetchPropertyReservations(partnerId, propertyId, currentMonth(), roomQuery.data?.roomType ?? null, token!),
    enabled: enabled && !!roomQuery.data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['room-availability', partnerId, propertyId, roomId, month] });
    queryClient.invalidateQueries({ queryKey: ['room-rates', partnerId, propertyId, roomId, month] });
    queryClient.invalidateQueries({ queryKey: ['property-reservations-room', partnerId, propertyId] });
  };

  const blockMutation = useMutation({
    mutationFn: (v: { from: string; to: string }) => blockPartnerRoomDates(partnerId, propertyId, roomId, v.from, v.to, token!),
    onSuccess: invalidate,
  });
  const unblockMutation = useMutation({
    mutationFn: (v: { from: string; to: string }) => unblockPartnerRoomDates(partnerId, propertyId, roomId, v.from, v.to, token!),
    onSuccess: invalidate,
  });
  const rateMutation = useMutation({
    mutationFn: (v: { from: string; toEx: string; price: number }) => createPartnerRoomRate(partnerId, propertyId, roomId, v.from, v.toEx, v.price, token!),
    onSuccess: invalidate,
  });
  const updateRateMutation = useMutation({
    mutationFn: (v: { rateId: string; from: string; toEx: string; price: number }) =>
      updatePartnerRoomRate(partnerId, propertyId, roomId, v.rateId, v.from, v.toEx, v.price, token!),
    onSuccess: invalidate,
  });
  const deleteRateMutation = useMutation({
    mutationFn: (rateId: string) => deletePartnerRoomRate(partnerId, propertyId, roomId, rateId, token!),
    onSuccess: invalidate,
  });

  const saving =
    blockMutation.isPending ||
    unblockMutation.isPending ||
    rateMutation.isPending ||
    updateRateMutation.isPending;

  const calendarDays = useMemo(() => {
    if (!roomQuery.data) return [];
    return buildCalendarDays(
      month,
      availQuery.data ?? [],
      ratesQuery.data ?? [],
      roomQuery.data.basePriceUsd,
      roomQuery.data.totalRooms,
    );
  }, [month, availQuery.data, ratesQuery.data, roomQuery.data]);

  const { occupancy, soldRooms } = useMemo(() => computeOccupancy(availQuery.data ?? []), [availQuery.data]);

  const upcoming = useMemo(
    () => selectUpcoming(upcomingQuery.data?.reservations ?? [], todayIso()),
    [upcomingQuery.data],
  );

  const blockedRanges = useMemo(
    () => groupBlockedRuns(availQuery.data ?? []),
    [availQuery.data],
  );

  const isPickingRange = drawerMode === 'rate-create' || drawerMode === 'block-create';
  const interactiveCalendar = isPickingRange && !selEnd;

  function clearSel() {
    setSelStart(null);
    setSelEnd(null);
    setHovDate(null);
    setHintMode('idle');
    setDrawerMode(null);
    setEditingRateId(null);
    setEditingInitialPrice(undefined);
  }

  function handleDayClick(date: string) {
    if (!isPickingRange) return;
    if (!selStart) {
      setSelStart(date);
      setHovDate(date);
      setHintMode('selecting');
    } else if (!selEnd) {
      setSelEnd(date);
      setHovDate(null);
      setHintMode('idle');
    }
  }

  function handleDayHover(date: string) {
    if (interactiveCalendar && selStart && !selEnd) setHovDate(date);
  }

  function startRateCreate() {
    clearSel();
    setDrawerMode('rate-create');
    setHintMode('selecting');
  }

  function startBlockCreate() {
    clearSel();
    setDrawerMode('block-create');
    setHintMode('selecting');
  }

  function startRateEdit(row: RatePlanRow) {
    if (row.kind !== 'override' || !row.fromDate || !row.toDate) return;
    const { from, to } = formatRatePeriodRange(row.fromDate, row.toDate);
    clearSel();
    setSelStart(from);
    setSelEnd(to);
    setEditingRateId(row.key);
    setEditingInitialPrice(row.priceUsd);
    setDrawerMode('rate-edit');
  }

  async function handleApply({ price }: { price: number | null }) {
    if (!selStart || !selEnd || !drawerMode) return;
    const lo = selStart < selEnd ? selStart : selEnd;
    const hi = selStart < selEnd ? selEnd : selStart;
    const toEx = addDays(hi, 1);

    if (drawerMode === 'rate-create' && price !== null && price > 0) {
      await rateMutation.mutateAsync({ from: lo, toEx, price });
    } else if (drawerMode === 'rate-edit' && editingRateId && price !== null && price > 0) {
      await updateRateMutation.mutateAsync({ rateId: editingRateId, from: lo, toEx, price });
    } else if (drawerMode === 'block-create') {
      await blockMutation.mutateAsync({ from: lo, to: toEx });
    }

    clearSel();
  }

  async function handleBlockDelete(range: BlockedRange) {
    await unblockMutation.mutateAsync({
      from: range.from,
      to: addDays(range.to, 1),
    });
  }

  if (!enabled) {
    return (
      <PageContainer>
        <Alert severity="info">{t('partner.dashboard.login_required')}</Alert>
      </PageContainer>
    );
  }

  const room = roomQuery.data;
  const subtitleParts = room
    ? [`${room.totalRooms} ${t('partner.room.subtitle_rooms')}`, room.bedType, t('partner.room.subtitle_capacity', { count: room.capacity })].filter(Boolean)
    : [];

  const deletingRange: BlockedRange | null = unblockMutation.isPending
    ? (unblockMutation.variables
        ? { from: unblockMutation.variables.from, to: dayjs.utc(unblockMutation.variables.to).subtract(1, 'day').format('YYYY-MM-DD') }
        : null)
    : null;

  return (
    <>
      <RoomHeroBanner
        propertyId={propertyId}
        propertyName={room ? propertyId.slice(0, 8) : '...'}
        roomType={room?.roomType ?? '...'}
        subtitle={subtitleParts.join(' · ')}
        status={room?.status ?? 'active'}
      />

      <PageContainer>
        {roomQuery.isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {room && (
          <>
            <RoomKpiStrip
              totalRooms={room.totalRooms}
              basePriceLabel={formatPrice(room.basePriceUsd, currency)}
              occupancy={occupancy}
              soldRooms={soldRooms}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                {availQuery.isLoading || ratesQuery.isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={22} />
                  </Box>
                ) : (
                  <RoomCalendar
                    month={month}
                    language={language}
                    days={calendarDays}
                    selStart={selStart}
                    selEnd={selEnd}
                    hovDate={hovDate}
                    hintMode={hintMode}
                    interactive={interactiveCalendar}
                    onPrevMonth={() => { setMonth((m) => shiftMonth(m, -1)); clearSel(); }}
                    onNextMonth={() => { setMonth((m) => shiftMonth(m, 1)); clearSel(); }}
                    onDayClick={handleDayClick}
                    onDayHover={handleDayHover}
                  />
                )}
              </Box>

              {drawerMode && selStart && selEnd ? (
                <RoomEditDrawer
                  key={`${drawerMode}-${selStart}-${selEnd}`}
                  mode={drawerMode}
                  selStart={selStart}
                  selEnd={selEnd}
                  initialPrice={editingInitialPrice}
                  saving={saving}
                  onClose={clearSel}
                  onApply={handleApply}
                />
              ) : (
                <Stack spacing={2}>
                  <RatePlanCard
                    basePriceUsd={room.basePriceUsd}
                    rates={ratesQuery.data ?? []}
                    currency={currency}
                    onNewRate={startRateCreate}
                    onEdit={startRateEdit}
                    onDelete={(rateId) => deleteRateMutation.mutate(rateId)}
                    deletingRateId={deleteRateMutation.isPending ? (deleteRateMutation.variables ?? null) : null}
                  />
                  <BlocksCard
                    ranges={blockedRanges}
                    onNewBlock={startBlockCreate}
                    onDelete={handleBlockDelete}
                    deletingRange={deletingRange}
                  />
                  <UpcomingReservationsCard
                    reservations={upcoming}
                    isLoading={upcomingQuery.isLoading}
                  />
                </Stack>
              )}
            </Box>
          </>
        )}
      </PageContainer>
    </>
  );
}
