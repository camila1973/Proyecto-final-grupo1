import { Box, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PropertyRevenueChart, { type PropertyRevenueDataPoint } from '../components/PropertyRevenueChart';
import RevenueTrendChart, { type RevenueTrendSeries, PROPERTY_COLORS } from '../components/RevenueTrendChart';
import type { PartnerMonthlyPoint } from '../../../utils/queries';

const BAR_COLORS = ['#1B4F8C', '#F09595', '#3B6D11'];
const BAR_LEGEND_KEYS = ['legend_gross', 'legend_commission', 'legend_net'] as const;
const COMMISSION_RATE = 0.2;

interface ChartsSectionProps {
  propertyName: string;
  monthlySeries: PartnerMonthlyPoint[];
  grossRevenue: number;
  loading: boolean;
  monthLabel: string;
}

export default function ChartsSection({
  propertyName,
  monthlySeries,
  grossRevenue,
  loading,
  monthLabel,
}: ChartsSectionProps) {
  const { t } = useTranslation();

  const barData: PropertyRevenueDataPoint[] = [{
    name: propertyName,
    gross: Math.round(grossRevenue),
    commission: Math.round(grossRevenue * COMMISSION_RATE),
    net: Math.round(grossRevenue * (1 - COMMISSION_RATE)),
  }];

  const trendSeries: RevenueTrendSeries[] = monthlySeries.length > 0 ? [{
    name: propertyName,
    color: PROPERTY_COLORS[0],
    points: monthlySeries,
  }] : [];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', mb: 1.5 }}>
          {t('partner.org_dashboard.chart_revenue_by_property', { month: monthLabel })}
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: '#e2e8f0' }}>
          <Box sx={{ display: 'flex', gap: 1.75, mb: 1.5, fontSize: 11, color: '#4a5568' }}>
            {BAR_LEGEND_KEYS.map((key, i) => (
              <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: BAR_COLORS[i] }} />
                <span>{t(`partner.org_dashboard.${key}`)}</span>
              </Box>
            ))}
          </Box>
          <PropertyRevenueChart data={barData} loading={loading} />
        </Paper>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', mb: 1.5 }}>
          {t('partner.org_dashboard.chart_trend')}
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: '#e2e8f0' }}>
          {trendSeries.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1.75, mb: 1.5, fontSize: 11, color: '#4a5568' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
                <Box sx={{ width: 10, height: 3, borderRadius: '2px', bgcolor: PROPERTY_COLORS[0] }} />
                <span>{propertyName.length > 12 ? propertyName.slice(0, 12) + '…' : propertyName}</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
                <Box sx={{ width: 10, height: 3, borderRadius: '2px', bgcolor: '#3B6D11' }} />
                <span>{t('partner.org_dashboard.legend_net')}</span>
              </Box>
            </Box>
          )}
          <RevenueTrendChart series={trendSeries} loading={loading} />
        </Paper>
      </Box>
    </Box>
  );
}
