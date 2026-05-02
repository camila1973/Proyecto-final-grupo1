import { CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PartnerMonthlyPoint } from '../../../utils/queries';

export interface RevenueTrendSeries {
  name: string;
  color: string;
  points: PartnerMonthlyPoint[];
}

export interface RevenueTrendChartProps {
  series: RevenueTrendSeries[];
  loading?: boolean;
}

const PROPERTY_COLORS = ['#1B4F8C', '#854F0B', '#6B46C1', '#0E7490'];
const NET_TOTAL_COLOR = '#3B6D11';

function yAxisFormatter(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export { PROPERTY_COLORS, NET_TOTAL_COLOR };

export default function RevenueTrendChart({ series, loading }: RevenueTrendChartProps) {
  const { t } = useTranslation();

  if (loading) return <CircularProgress size={24} />;
  if (series.length === 0) return null;

  const months = series[0].points.map((p) => p.month.slice(0, 7));
  const chartData = months.map((month, i) => {
    const row: Record<string, number | string> = { month };
    series.forEach((s) => {
      row[s.name] = Math.round(s.points[i]?.revenueUsd ?? 0);
    });
    return row;
  });

  const netTotalData = months.map((month, i) => {
    const total = series.reduce((sum, s) => sum + (s.points[i]?.revenueUsd ?? 0), 0);
    return { month, net: Math.round(total) };
  });

  const merged = chartData.map((row, i) => ({ ...row, net: netTotalData[i].net }));

  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={merged} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4a5568' }} />
        <YAxis tick={{ fontSize: 10, fill: '#4a5568' }} tickFormatter={yAxisFormatter} />
        <Tooltip formatter={(v: unknown) => yAxisFormatter(Number(v ?? 0))} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#4a5568' }} />
        {series.map((s) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={s.color}
            dot={{ r: 3 }}
            strokeDasharray={series.indexOf(s) > 0 ? '4 2' : undefined}
          />
        ))}
        <Line
          type="monotone"
          dataKey="net"
          stroke={NET_TOTAL_COLOR}
          dot={{ r: 3 }}
          name={t('partner.org_dashboard.legend_net')}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
