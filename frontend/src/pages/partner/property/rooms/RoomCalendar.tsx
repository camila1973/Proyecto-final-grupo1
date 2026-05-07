import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '../../../../utils/currency';
import type { CalendarDay, DayState } from './calendarDays';

const STATE_BG: Record<DayState, string> = {
  available: '#EAF3DE',
  low: '#FAEEDA',
  'sold-out': '#FCEBEB',
  blocked: 'repeating-linear-gradient(45deg, #e8e8e8, #e8e8e8 4px, #fff 4px, #fff 8px)',
  default: '#fff',
};

const DOW_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface RoomCalendarProps {
  month: string;
  days: CalendarDay[];
  selStart: string | null;
  selEnd: string | null;
  hovDate: string | null;
  onDayClick: (date: string) => void;
  onDayHover: (date: string) => void;
}

export default function RoomCalendar({
  month,
  days,
  selStart,
  selEnd,
  hovDate,
  onDayClick,
  onDayHover,
}: RoomCalendarProps) {
  const { t } = useTranslation();
  const [y, m] = month.split('-').map(Number);
  const firstDayOfWeek = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
    <Box sx={{ bgcolor: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
      {/* Day-of-week header */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '0.5px solid #e2e8f0' }}>
        {DOW_ES.map((d, i) => (
          <Box
            key={d}
            sx={{
              py: '8px',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 500,
              color: i === 0 || i === 6 ? '#9ca3af' : '#4a5568',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              bgcolor: '#F5F7FA',
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
              borderRight: '0.5px solid #e2e8f0',
              borderBottom: '0.5px solid #e2e8f0',
              bgcolor: '#F9FAFB',
              opacity: 0.5,
            }}
          />
        ))}

        {days.map((day, idx) => {
          const d = new Date(`${day.date}T00:00:00`);
          const isPast = d < today;
          const dayNum = d.getUTCDate();
          const isToday = d.toDateString() === today.toDateString();
          const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
          const col = (firstDayOfWeek + idx) % 7;
          const { isStart, isEnd, isMid, isHover } = getRangeClasses(day.date);

          let bg = STATE_BG[day.state];
          if (!isPast) {
            if (isStart || isEnd) bg = '#1e3a5f';
            else if (isMid) bg = '#E6F1FB';
            else if (isHover) bg = '#b5d4f4';
          }

          const textColor = isStart || isEnd ? '#fff' : '#1a1a1a';
          const subColor = isStart || isEnd ? 'rgba(255,255,255,0.7)' : '#6b7280';

          return (
            <Box
              key={day.date}
              onMouseEnter={() => !isPast && onDayHover(day.date)}
              onClick={() => !isPast && onDayClick(day.date)}
              sx={{
                minHeight: 88,
                p: '8px',
                borderRight: col === 6 ? 'none' : '0.5px solid #e2e8f0',
                borderBottom: '0.5px solid #e2e8f0',
                background: bg,
                opacity: isPast ? 0.35 : 1,
                cursor: isPast ? 'default' : 'pointer',
                transition: 'background 0.1s',
                verticalAlign: 'top',
                '&:hover': !isPast && !isStart && !isEnd ? { filter: 'brightness(0.97)' } : {},
              }}
            >
              {/* Day number */}
              <Box
                sx={{
                  fontSize: 13,
                  fontWeight: 500,
                  mb: '6px',
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  bgcolor: isToday && !isStart && !isEnd ? '#1e3a5f' : isStart || isEnd ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: isToday && !isStart && !isEnd ? '#fff' : isWeekend ? subColor : textColor,
                }}
              >
                {dayNum}
              </Box>

              {!isPast && (
                <>
                  {day.avail?.blocked ? (
                    <Typography sx={{ fontSize: 11, color: subColor, mt: '4px' }}>
                      {t('partner.room.cell_blocked_label')}
                    </Typography>
                  ) : (
                    <>
                      {day.avail && (
                        <>
                          <Box sx={{ fontSize: 18, fontWeight: 500, lineHeight: 1, color: day.state === 'sold-out' ? '#A32D2D' : day.state === 'low' ? '#633806' : textColor }}>
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', mt: '4px' }}>
                        <Typography sx={{ fontSize: 11, color: subColor, fontFamily: 'monospace' }}>
                          {formatPrice(day.rate, 'USD')}
                        </Typography>
                        {day.hasOverride && (
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isStart || isEnd ? 'rgba(255,255,255,0.8)' : '#E8A825', flexShrink: 0 }} />
                        )}
                      </Box>
                      {day.avail && day.avail.heldRooms > 0 && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: 10, color: '#633806', bgcolor: '#FAEEDA', px: '5px', py: '1px', borderRadius: '3px', mt: '3px' }}>
                          ⏱ {day.avail.heldRooms} {t('partner.room.cell_held_label')}
                        </Box>
                      )}
                    </>
                  )}
                </>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
