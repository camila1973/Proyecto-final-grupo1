import { Box, Card, Typography } from '@mui/material';

export interface MetricCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'positive' | 'negative';
  testId?: string;
}

const VARIANT_COLORS: Record<NonNullable<MetricCardProps['variant']>, string> = {
  default: '#000',
  positive: '#27ae60',
  negative: '#e74c3c',
};

export default function MetricCard({ label, value, variant = 'default', testId }: MetricCardProps) {
  return (
    <Card data-testid={testId} sx={{ p: 2, minWidth: 180, textAlign: 'center', boxShadow: 1 }}>
      <Typography
        variant="h4"
        component="div"
        sx={{ fontWeight: 700, color: VARIANT_COLORS[variant], mb: 0.5 }}
      >
        {value}
      </Typography>
      <Box sx={{ fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Box>
    </Card>
  );
}
