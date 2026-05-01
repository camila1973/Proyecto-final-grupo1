import { CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface PropertyRevenueDataPoint {
  name: string;
  gross: number;
  commission: number;
  net: number;
}

export interface PropertyRevenueChartProps {
  data: PropertyRevenueDataPoint[];
  loading?: boolean;
}

function yAxisFormatter(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export default function PropertyRevenueChart({ data, loading }: PropertyRevenueChartProps) {
  const { t } = useTranslation();

  if (loading) return <CircularProgress size={24} />;

  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#4a5568' }}
          tickFormatter={(v: string) => (v.length > 15 ? v.slice(0, 15) + '…' : v)}
        />
        <YAxis tick={{ fontSize: 10, fill: '#4a5568' }} tickFormatter={yAxisFormatter} />
        <Tooltip formatter={(v: unknown) => yAxisFormatter(Number(v ?? 0))} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#4a5568' }}
          formatter={(name: string) => {
            if (name === 'gross') return t('partner.org_dashboard.legend_gross');
            if (name === 'commission') return t('partner.org_dashboard.legend_commission');
            return t('partner.org_dashboard.legend_net');
          }}
        />
        <Bar dataKey="gross" fill="#1B4F8C" />
        <Bar dataKey="commission" fill="#F09595" />
        <Bar dataKey="net" fill="#3B6D11" />
      </BarChart>
    </ResponsiveContainer>
  );
}
