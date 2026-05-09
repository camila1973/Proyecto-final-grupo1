import { Box, Card, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

interface RoomKpiStripProps {
  totalRooms: number;
  basePriceLabel: string;
  occupancy: number;
  soldRooms: number;
}

interface KpiCellProps {
  label: string;
  value: string | number;
  sub: string;
  valueColor?: string;
}

function KpiCell({ label, value, sub, valueColor }: KpiCellProps) {
  return (
    <Card sx={{ p: 2 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: valueColor ?? 'text.primary', mt: 0.5 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
        {sub}
      </Typography>
    </Card>
  );
}

export default function RoomKpiStrip({ totalRooms, basePriceLabel, occupancy, soldRooms }: RoomKpiStripProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const occupancyPercent = Math.round(occupancy * 100);
  const occupancyColor = occupancy >= 0.85 ? theme.palette.success.main : theme.palette.primary.main;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
      <KpiCell
        label={t('partner.room.kpi_total_rooms')}
        value={totalRooms}
        sub={t('partner.room.kpi_total_rooms_sub')}
      />
      <KpiCell
        label={t('partner.room.kpi_base_rate')}
        value={basePriceLabel}
        sub={t('partner.room.kpi_base_rate_sub')}
        valueColor={theme.palette.primary.main}
      />
      <KpiCell
        label={t('partner.room.kpi_occupancy')}
        value={`${occupancyPercent}%`}
        sub={t('partner.room.kpi_occupancy_sub', { sold: soldRooms, total: totalRooms })}
        valueColor={occupancyColor}
      />
    </Box>
  );
}
