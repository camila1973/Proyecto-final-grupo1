import { Box, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PropertyRevenueChart, { type PropertyRevenueDataPoint } from '../components/PropertyRevenueChart';
import RevenueTrendChart, { type RevenueTrendSeries } from '../components/RevenueTrendChart';

const BAR_COLORS = ['#1B4F8C', '#F09595', '#3B6D11'];
const BAR_LEGEND_KEYS = ['legend_gross', 'legend_commission', 'legend_net'] as const;

interface ChartsSectionProps {
  barData: PropertyRevenueDataPoint[];
  trendSeries: RevenueTrendSeries[];
  anyPropertyLoading: boolean;
  monthLabel: string;
}

export default function ChartsSection({
  barData,
  trendSeries,
  anyPropertyLoading,
  monthLabel,
}: ChartsSectionProps) {
  const { t } = useTranslation();
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
          <PropertyRevenueChart data={barData} loading={anyPropertyLoading} />
        </Paper>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', mb: 1.5 }}>
          {t('partner.org_dashboard.chart_trend')}
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: '#e2e8f0' }}>
          {trendSeries.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1.75, mb: 1.5, fontSize: 11, color: '#4a5568' }}>
              {trendSeries.map((s) => (
                <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
                  <Box sx={{ width: 10, height: 3, borderRadius: '2px', bgcolor: s.color }} />
                  <span>{s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name}</span>
                </Box>
              ))}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
                <Box sx={{ width: 10, height: 3, borderRadius: '2px', bgcolor: '#3B6D11' }} />
                <span>{t('partner.org_dashboard.legend_net')}</span>
              </Box>
            </Box>
          )}
          <RevenueTrendChart series={trendSeries} loading={anyPropertyLoading} />
        </Paper>
      </Box>
    </Box>
  );
}
