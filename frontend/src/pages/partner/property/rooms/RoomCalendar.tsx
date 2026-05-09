import { Box, Card, IconButton, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '../../../../utils/currency';
import { formatMonthLabel } from '../../../../utils/month';
import dayjs from '../../../../utils/dayjs';
import type { Language } from '../../../../context/LocaleContext';
import type { CalendarDay, DayState } from './calendarDays';

const DOW_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface RoomCalendarProps {
  month: string;
  language: Language;
  days: CalendarDay[];
  selStart: string | null;
  selEnd: string | null;
  hovDate: string | null;
  hintMode: 'idle' | 'selecting';
  interactive: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (date: string) => void;
  onDayHover: (date: string) => void;
}

export default function RoomCalendar({
  month,
  language,
  days,
  selStart,
  selEnd,
  hovDate,
  hintMode,
  interactive,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  onDayHover,
}: RoomCalendarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const monthStart = dayjs.utc(`${month}-01`);
  const firstDayOfWeek = monthStart.day();
  const todayIso = dayjs().format('YYYY-MM-DD');

  const stateBg: Record<DayState, string> = {
    available: theme.palette.success.light,
    low: theme.palette.warning.light,
    'sold-out': theme.palette.error.light,
    blocked: 'repeating-linear-gradient(45deg, #e8e8e8, #e8e8e8 4px, #fff 4px, #fff 8px)',
    default: '#fff',
  };

  const legend = [
    { bg: theme.palette.success.light, border: theme.palette.success.main, label: t('partner.room.legend_available') },
    { bg: theme.palette.warning.light, border: theme.palette.warning.main, label: t('partner.room.legend_low') },
    { bg: theme.palette.error.light, border: theme.palette.error.main, label: t('partner.room.legend_sold_out') },
    { bg: 'repeating-linear-gradient(45deg,#e8e8e8,#e8e8e8 3px,#fff 3px,#fff 6px)', border: '#d1d5db', label: t('partner.room.legend_blocked') },
    { bg: theme.palette.warning.main, border: theme.palette.warning.dark, label: t('partner.room.legend_override'), kind: 'bar' as const },
  ];

  function getRangeClasses(date: string): { isStart: boolean; isEnd: boolean; isMid: boolean; isHover: boolean } {
    if (!selStart) return { isStart: false, isEnd: false, isMid: false, isHover: false };
    const eff = selEnd ?? (hovDate ?? selStart);
    const lo = selStart < eff ? selStart : eff;
    const hi = selStart < eff ? eff : selStart;
    const isStart = date === lo;
    const isEnd = selEnd ? date === hi : false;
    const isMid = selEnd ? date > lo && date < hi : false;
    const isHover = !selEnd && date > lo && date <= hi;
    return { isStart, isEnd, isMid, isHover };
  }

  return (
    <Card sx={{ p: 2.5 }}>
      {/* Toolbar: month nav + legend */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton size="small" color="primary" onClick={onPrevMonth} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ fontSize: 15, fontWeight: 600, minWidth: 150, textAlign: 'center' }}>
            {formatMonthLabel(month, language)}
          </Typography>
          <IconButton size="small" color="primary" onClick={onNextMonth} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          {legend.map(({ bg, border, label, kind }) => (
            <Stack key={label} direction="row" spacing={0.5} alignItems="center">
              <Box
                sx={
                  kind === 'bar'
                    ? { width: 12, height: 3, borderRadius: '1px', background: bg }
                    : { width: 10, height: 10, borderRadius: '2px', background: bg, border: `0.5px solid ${border}` }
                }
              />
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{label}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* Hint bar */}
      <Box sx={{
        bgcolor: hintMode === 'selecting' ? 'info.light' : 'background.default',
        border: '0.5px solid',
        borderColor: hintMode === 'selecting' ? 'info.main' : 'divider',
        borderRadius: 1.5,
        px: 1.5,
        py: '6px',
        fontSize: 12,
        color: hintMode === 'selecting' ? 'info.dark' : 'text.secondary',
        mb: 1.5,
      }}>
        ℹ︎ {hintMode === 'selecting' ? t('partner.room.hint_selecting') : t('partner.room.hint_default')}
      </Box>

      {/* Day-of-week header */}
      <Box sx={{ border: '0.5px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '0.5px solid', borderColor: 'divider' }}>
          {DOW_ES.map((d, i) => (
            <Box
              key={d}
              sx={{
                py: '8px',
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: i === 0 || i === 6 ? 'text.disabled' : 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                bgcolor: 'background.default',
              }}
            >
              {d}
            </Box>
          ))}
        </Box>

        {/* Calendar grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {/* Leading empty cells */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <Box
              key={`empty-${i}`}
              sx={{
                minHeight: 88,
                borderRight: '0.5px solid',
                borderBottom: '0.5px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
                opacity: 0.5,
              }}
            />
          ))}

          {days.map((day, idx) => {
            const d = dayjs.utc(day.date);
            const isPast = day.date < todayIso;
            const dayNum = d.date();
            const isToday = day.date === todayIso;
            const isWeekend = d.day() === 0 || d.day() === 6;
            const col = (firstDayOfWeek + idx) % 7;
            const { isStart, isEnd, isMid, isHover } = getRangeClasses(day.date);

            let bg = stateBg[day.state];
            if (!isPast) {
              if (isStart || isEnd) bg = theme.palette.primary.main;
              else if (isMid) bg = theme.palette.info.light;
              else if (isHover) bg = '#b5d4f4';
            }

            const textColor = isStart || isEnd ? '#fff' : theme.palette.text.primary;
            const subColor = isStart || isEnd ? 'rgba(255,255,255,0.7)' : theme.palette.text.secondary;

            return (
              <Box
                key={day.date}
                onMouseEnter={() => !isPast && onDayHover(day.date)}
                onClick={() => !isPast && onDayClick(day.date)}
                sx={{
                  position: 'relative',
                  minHeight: 88,
                  p: '8px',
                  borderRight: col === 6 ? 'none' : '0.5px solid',
                  borderBottom: '0.5px solid',
                  borderColor: 'divider',
                  background: bg,
                  opacity: isPast ? 0.55 : 1,
                  cursor: isPast || !interactive ? 'default' : 'pointer',
                  transition: 'background 0.1s',
                  verticalAlign: 'top',
                  '&:hover': interactive && !isPast && !isStart && !isEnd ? { filter: 'brightness(0.97)' } : {},
                }}
              >
                {day.hasOverride && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      bgcolor: isStart || isEnd ? 'rgba(255,255,255,0.85)' : theme.palette.warning.main,
                    }}
                  />
                )}
                {/* Day number */}
                <Box
                  sx={{
                    fontSize: 13,
                    fontWeight: isToday ? 700 : 500,
                    mb: '6px',
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: isToday && !isStart && !isEnd ? 'primary.main' : isStart || isEnd ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: isToday && !isStart && !isEnd ? '#fff' : isWeekend ? subColor : textColor,
                  }}
                >
                  {dayNum}
                </Box>

                {day.avail?.blocked ? (
                  <Typography sx={{ fontSize: 11, color: subColor, mt: '4px' }}>
                    {t('partner.room.cell_blocked_label')}
                  </Typography>
                ) : (
                  <>
                    {day.avail && (
                      <>
                        <Box sx={{ fontSize: 18, fontWeight: 500, lineHeight: 1, color: day.state === 'sold-out' ? theme.palette.error.dark : day.state === 'low' ? theme.palette.warning.dark : textColor }}>
                          {day.avail.totalRooms - day.avail.reservedRooms - day.avail.heldRooms}
                          <Box component="span" sx={{ fontSize: 11, fontWeight: 400, color: subColor }}>
                            /{day.avail.totalRooms}
                          </Box>
                        </Box>
                        <Typography sx={{ fontSize: 10, color: subColor, mt: '2px' }}>
                          {t('partner.room.cell_available_label')}
                        </Typography>
                      </>
                    )}
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: subColor,
                        fontFamily: 'monospace',
                        mt: '4px',
                        fontWeight: day.hasOverride ? 700 : 400,
                      }}
                    >
                      {formatPrice(day.rate, 'USD')}
                    </Typography>
                    {day.avail && day.avail.heldRooms > 0 && (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: 10, color: theme.palette.warning.dark, bgcolor: 'warning.light', px: '5px', py: '1px', borderRadius: '3px', mt: '3px' }}>
                        ⏱ {day.avail.heldRooms} {t('partner.room.cell_held_label')}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Card>
  );
}
