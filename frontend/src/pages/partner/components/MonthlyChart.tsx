import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Box, Skeleton } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../../context/LocaleContext';
import { shortMonthLabel } from '../../../utils/month';
import type { PartnerMonthlyPoint } from '../../../utils/queries';
import { buildLegendFormatter, buildTooltipFormatter } from './chart-formatters';

export interface MonthlyChartProps {
  data: PartnerMonthlyPoint[];
  loading?: boolean;
}

export default function MonthlyChart({ data, loading = false }: MonthlyChartProps) {
  const { t } = useTranslation();
  const { language, currency } = useLocale();

  const chartData = data.map((p) => ({
    monthLabel: shortMonthLabel(p.month, language),
    revenue: Math.round(p.revenueUsd),
    losses: Math.round(p.lossesUsd),
    occupancy: Math.round(p.occupancyRate * 100),
  }));

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <Skeleton variant="text" width={200} height={28} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={252} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 252 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="monthLabel" />
          <YAxis />
          <Tooltip formatter={buildTooltipFormatter(t, currency)} />
          <Legend formatter={buildLegendFormatter(t)} />
          <Bar dataKey="revenue" fill="#27ae60" />
          <Bar dataKey="losses" fill="#e74c3c" />
          <Bar dataKey="occupancy" fill="#3b5998" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
