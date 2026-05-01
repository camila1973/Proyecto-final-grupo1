import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../../context/LocaleContext';
import { shortMonthLabel } from '../../../utils/month';
import type { PartnerMonthlyPoint } from '../../../utils/queries';
import { buildLegendFormatter, buildTooltipFormatter } from './chart-formatters';

export interface MonthlyChartProps {
  data: PartnerMonthlyPoint[];
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  const { t } = useTranslation();
  const { language, currency } = useLocale();

  const chartData = data.map((p) => ({
    monthLabel: shortMonthLabel(p.month, language),
    revenue: Math.round(p.revenueUsd),
    losses: Math.round(p.lossesUsd),
    occupancy: Math.round(p.occupancyRate * 100),
  }));

  return (
    <Box sx={{ width: '100%', height: 280, mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {t('partner.dashboard.chart_title')}
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
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
