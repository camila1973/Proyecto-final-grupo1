import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { PartnerReservationRow } from '../../../utils/queries';

interface TodayMovementsProps {
  checkIns: PartnerReservationRow[];
  checkOuts: PartnerReservationRow[];
  loading?: boolean;
}

interface PanelProps {
  title: string;
  emptyLabel: string;
  timeLabel: string;
  rows: PartnerReservationRow[];
  loading: boolean;
}

function Row({ row, timeLabel, last }: { row: PartnerReservationRow; timeLabel: string; last: boolean }) {
  const name = row.guestName && row.guestName !== '—' ? row.guestName : null;
  const phone = row.guestPhone && row.guestPhone !== '—' ? row.guestPhone : null;
  return (
    <Box
      sx={{
        py: 1.25,
        borderBottom: last ? 'none' : '1px solid #f1f5f9',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
            {name ?? '—'}
          </Typography>
          {phone && (
            <Typography sx={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', mt: 0.25 }}>
              {phone}
            </Typography>
          )}
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
            {row.roomType.toLowerCase()}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#1B4F8C', whiteSpace: 'nowrap', mt: 0.25 }}>
            {timeLabel}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

function Panel({ title, emptyLabel, timeLabel, rows, loading }: PanelProps) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, borderRadius: 2, borderColor: '#e2e8f0' }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
          {title}
        </Typography>
        <Box
          sx={{
            bgcolor: '#E5E9F0',
            color: '#1B4F8C',
            borderRadius: 999,
            px: 1.25,
            py: 0.25,
            fontSize: 11,
            fontWeight: 600,
            minWidth: 22,
            textAlign: 'center',
          }}
        >
          {rows.length}
        </Box>
      </Stack>

      {loading ? (
        <Stack spacing={1.25}>
          {[0, 1, 2].map((i) => (
            <Box key={i}>
              <Skeleton variant="text" width="60%" height={18} />
              <Skeleton variant="text" width="40%" height={14} />
            </Box>
          ))}
        </Stack>
      ) : rows.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: '#9ca3af', py: 2, textAlign: 'center' }}>
          {emptyLabel}
        </Typography>
      ) : (
        <Box>
          {rows.map((r, i) => (
            <Row key={r.id} row={r} timeLabel={timeLabel} last={i === rows.length - 1} />
          ))}
        </Box>
      )}
    </Paper>
  );
}

export default function TodayMovements({ checkIns, checkOuts, loading = false }: TodayMovementsProps) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 2,
      }}
    >
      <Panel
        title={t('partner.dashboard.today_checkins')}
        emptyLabel={t('partner.dashboard.today_no_checkins')}
        timeLabel={t('partner.dashboard.today_checkin_time')}
        rows={checkIns}
        loading={loading}
      />
      <Panel
        title={t('partner.dashboard.today_checkouts')}
        emptyLabel={t('partner.dashboard.today_no_checkouts')}
        timeLabel={t('partner.dashboard.today_checkout_time')}
        rows={checkOuts}
        loading={loading}
      />
    </Box>
  );
}
