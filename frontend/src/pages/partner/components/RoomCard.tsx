import KingBedIcon from '@mui/icons-material/KingBed';
import { Box, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Currency } from '../../../context/LocaleContext';
import { formatPrice } from '../../../utils/currency';
import { StatusPill } from '../sections/ui';

export interface RoomCardProps {
  roomId: string;
  roomType: string;
  bedType: string;
  capacity: number;
  totalRooms: number;
  basePriceUsd: number;
  occupancyRate: number;
  revenueUsd: number;
  active: boolean;
  currency: Currency;
  loading?: boolean;
  onClick?: () => void;
}

function StatCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 10, color: '#4a5568', letterSpacing: 0.5, mb: 0.5 }}>
        {label.toUpperCase()}
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: valueColor ?? '#1a1a1a', lineHeight: 1.2 }}>
        {value}
      </Typography>
    </Box>
  );
}

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function RoomCard({
  roomType,
  bedType,
  capacity,
  totalRooms,
  basePriceUsd,
  occupancyRate,
  revenueUsd,
  active,
  currency,
  loading = false,
  onClick,
}: RoomCardProps) {
  const { t } = useTranslation();
  const dash = '—';
  const occupancyPct = Math.round(occupancyRate * 100);
  const sold = Math.min(totalRooms, Math.round(occupancyRate * totalRooms));
  const soldPct = totalRooms > 0 ? Math.min(100, (sold / totalRooms) * 100) : 0;

  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        borderColor: '#e2e8f0',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
        '&:hover': onClick ? { borderColor: '#1B4F8C', boxShadow: '0 1px 3px rgba(27, 79, 140, 0.08)' } : undefined,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              bgcolor: '#E5E9F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <KingBedIcon sx={{ color: '#1B4F8C', fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 17,
                fontWeight: 700,
                color: '#1a1a1a',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {capitalize(roomType)}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace', mt: 0.25 }}>
              {roomType} · {bedType}
            </Typography>
          </Box>
        </Stack>
        <StatusPill active={active} />
      </Stack>

      <Box
        sx={{
          bgcolor: '#F5F7FA',
          borderRadius: 1,
          p: 2,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 2,
          mb: 1.5,
        }}
      >
        <StatCell
          label={t('partner.org_dashboard.card_inventory')}
          value={String(totalRooms)}
        />
        <StatCell
          label={t('partner.org_dashboard.card_rate')}
          value={formatPrice(basePriceUsd, currency)}
        />
        <StatCell
          label={t('partner.org_dashboard.card_occupancy')}
          value={`${occupancyPct}%`}
        />
        <StatCell
          label={t('partner.org_dashboard.card_revenue_month')}
          value={loading ? dash : formatPrice(revenueUsd, currency)}
          valueColor="#3B6D11"
        />
      </Box>

      <Stack direction="column" spacing={0.75}>
        <LinearProgress
          variant="determinate"
          value={soldPct}
          sx={{
            height: 5,
            borderRadius: 3,
            bgcolor: '#e2e8f0',
            '& .MuiLinearProgress-bar': { bgcolor: '#1B4F8C' },
          }}
        />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography sx={{ fontSize: 11, color: '#4a5568' }}>
            {t('partner.dashboard.card_sold_total', { sold, total: totalRooms })}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#4a5568' }}>
            {t('partner.dashboard.card_capacity', { count: capacity })}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
