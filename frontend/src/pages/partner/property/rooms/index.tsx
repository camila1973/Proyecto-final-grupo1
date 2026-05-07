import { useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '../../../../hooks/useAuth';
import { useLocale } from '../../../../context/LocaleContext';
import {
  fetchPartnerRoomById,
  fetchPartnerRoomAvailability,
  fetchPartnerRoomRates,
  blockPartnerRoomDates,
  unblockPartnerRoomDates,
  createPartnerRoomRate,
} from '../../../../utils/queries';
import { currentMonth, formatMonthLabel, shiftMonth } from '../../../../utils/month';
import RoomHeroBanner from './RoomHeroBanner';
import RoomSummaryStrip from './RoomSummaryStrip';
import RoomCalendar from './RoomCalendar';
import { buildCalendarDays } from './calendarDays';
import RoomEditDrawer from './RoomEditDrawer';

const NAV_BTN = { bgcolor: '#1B4F8C', color: '#fff', '&:hover': { bgcolor: '#163d6e' } } as const;

function monthWindow(month: string): { fromDate: string; toDate: string } {
  const [y, m] = month.split('-').map(Number);
  const fromDate = `${month}-01`;
  const next = new Date(Date.UTC(y, m, 1));
  const toDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return { fromDate, toDate };
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
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
  const [defaultBlock, setDefaultBlock] = useState(false);
  const [rangeSelectMode, setRangeSelectMode] = useState(false);

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['room-availability', partnerId, propertyId, roomId, month] });
    queryClient.invalidateQueries({ queryKey: ['room-rates', partnerId, propertyId, roomId, month] });
  };

  const blockMutation = useMutation({ mutationFn: (v: { from: string; to: string }) => blockPartnerRoomDates(partnerId, propertyId, roomId, v.from, v.to, token!), onSuccess: invalidate });
  const unblockMutation = useMutation({ mutationFn: (v: { from: string; to: string }) => unblockPartnerRoomDates(partnerId, propertyId, roomId, v.from, v.to, token!), onSuccess: invalidate });
  const rateMutation = useMutation({ mutationFn: (v: { from: string; toEx: string; price: number }) => createPartnerRoomRate(partnerId, propertyId, roomId, v.from, v.toEx, v.price, token!), onSuccess: invalidate });

  const saving = blockMutation.isPending || unblockMutation.isPending || rateMutation.isPending;

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

  function resolveDefaultBlock(lo: string, hi: string): boolean {
    return calendarDays.some((d) => d.date >= lo && d.date <= hi && d.avail?.blocked === true);
  }

  function openSingleDay(date: string) {
    setDefaultBlock(resolveDefaultBlock(date, date));
    setSelStart(date);
    setSelEnd(date);
    setHovDate(null);
    setHintMode('idle');
  }

  function handleDayClick(date: string) {
    if (!rangeSelectMode) {
      // Direct click: always open drawer for that single day
      openSingleDay(date);
      return;
    }
    // Range-select mode (entered via strip buttons)
    if (!selStart) {
      setSelStart(date);
      setHovDate(date);
      setHintMode('selecting');
    } else if (!selEnd) {
      const lo = selStart < date ? selStart : date;
      const hi = selStart < date ? date : selStart;
      setDefaultBlock(resolveDefaultBlock(lo, hi));
      setSelEnd(date);
      setHovDate(null);
      setHintMode('idle');
    } else {
      // Drawer open: reset to a new single day
      openSingleDay(date);
      setRangeSelectMode(false);
    }
  }

  function handleDayHover(date: string) {
    if (rangeSelectMode && selStart && !selEnd) setHovDate(date);
  }

  function clearSel() {
    setSelStart(null);
    setSelEnd(null);
    setHovDate(null);
    setHintMode('idle');
    setRangeSelectMode(false);
  }

  async function handleApply({ price, block }: { avail: number | null; price: number | null; block: boolean }) {
    if (!selStart || !selEnd) return;
    const lo = selStart < selEnd ? selStart : selEnd;
    const hi = selStart < selEnd ? selEnd : selStart;
    const toEx = addDays(hi, 1);

    if (block) await blockMutation.mutateAsync({ from: lo, to: toEx });
    else await unblockMutation.mutateAsync({ from: lo, to: toEx });

    if (price !== null && price > 0) await rateMutation.mutateAsync({ from: lo, toEx, price });

    clearSel();
  }

  if (!enabled) {
    return (
      <Box sx={{ maxWidth: 1152, mx: 'auto', p: 4 }}>
        <Alert severity="info">{t('partner.dashboard.login_required')}</Alert>
      </Box>
    );
  }

  const room = roomQuery.data;

  return (
    <div className="min-h-screen">
      <RoomHeroBanner
        propertyId={propertyId}
        propertyName={room ? `${propertyId.slice(0, 8)}` : '...'}
        roomType={room?.roomType ?? '...'}
        subtitle={`${propertyId.slice(0, 8)} · ${room?.viewType ?? ''}`}
      />

      {room && (
        <RoomSummaryStrip
          room={room}
          currency={currency}
          onBlockRange={() => { clearSel(); setDefaultBlock(true); setRangeSelectMode(true); setHintMode('selecting'); }}
          onAddRate={() => { clearSel(); setDefaultBlock(false); setRangeSelectMode(true); setHintMode('selecting'); }}
        />
      )}

      <div className="max-w-[1152px] mx-auto px-6 py-6 flex flex-col gap-4">
        {roomQuery.isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {room && (
          <>
            {/* Toolbar: month nav + legend */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <IconButton size="small" onClick={() => { setMonth((m) => shiftMonth(m, -1)); clearSel(); }} sx={NAV_BTN}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Typography sx={{ fontSize: 15, fontWeight: 500, minWidth: 150, textAlign: 'center' }}>
                  {formatMonthLabel(month, language)}
                </Typography>
                <IconButton size="small" onClick={() => { setMonth((m) => shiftMonth(m, 1)); clearSel(); }} sx={NAV_BTN}>
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                {[
                  { bg: '#EAF3DE', border: '#C0DD97', label: t('partner.room.legend_available') },
                  { bg: '#FAEEDA', border: '#FAC775', label: t('partner.room.legend_low') },
                  { bg: '#FCEBEB', border: '#F7C1C1', label: t('partner.room.legend_sold_out') },
                  { bg: 'repeating-linear-gradient(45deg,#e8e8e8,#e8e8e8 3px,#fff 3px,#fff 6px)', border: '#d1d5db', label: t('partner.room.legend_blocked') },
                ].map(({ bg, border, label }) => (
                  <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', background: bg, border: `0.5px solid ${border}` }} />
                    <Typography sx={{ fontSize: 11, color: '#6b7280' }}>{label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {/* Hint bar */}
            <Box sx={{
              bgcolor: hintMode === 'selecting' ? '#E6F1FB' : '#F9FAFB',
              border: `0.5px solid ${hintMode === 'selecting' ? '#B5D4F4' : '#e2e8f0'}`,
              borderRadius: 1.5,
              px: 2,
              py: '7px',
              fontSize: 12,
              color: hintMode === 'selecting' ? '#0C447C' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}>
              ℹ︎ {hintMode === 'selecting' ? t('partner.room.hint_selecting') : t('partner.room.hint_default')}
            </Box>

            {/* Calendar + drawer */}
            <Box sx={{ display: 'flex', gap: 0, border: '0.5px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {availQuery.isLoading || ratesQuery.isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={22} />
                  </Box>
                ) : (
                  <RoomCalendar
                    month={month}
                    days={calendarDays}
                    selStart={selStart}
                    selEnd={selEnd}
                    hovDate={hovDate}
                    onDayClick={handleDayClick}
                    onDayHover={handleDayHover}
                  />
                )}
              </Box>
              <RoomEditDrawer
                key={selStart && selEnd ? `${selStart}-${selEnd}` : 'closed'}
                open={!!selEnd}
                selStart={selStart}
                selEnd={selEnd}
                totalRooms={room.totalRooms}
                defaultBlock={defaultBlock}
                saving={saving}
                onClose={clearSel}
                onApply={handleApply}
              />
            </Box>
          </>
        )}
      </div>
    </div>
  );
}
