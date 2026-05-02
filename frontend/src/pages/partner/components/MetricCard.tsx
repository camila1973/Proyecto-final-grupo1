import { Card, Skeleton, Typography } from '@mui/material';

export interface MetricCardProps {
  label: string;
  value: string;
  subLabel?: string;
  subColor?: string;
  variant?: 'default' | 'positive' | 'negative';
  testId?: string;
  loading?: boolean;
}

const VARIANT_COLORS: Record<NonNullable<MetricCardProps['variant']>, string> = {
  default: '#1a1a1a',
  positive: '#27ae60',
  negative: '#e74c3c',
};

export default function MetricCard({
  label,
  value,
  subLabel,
  subColor = '#4a5568',
  variant = 'default',
  testId,
  loading = false,
}: MetricCardProps) {
  return (
    <Card
      data-testid={testId}
      variant="outlined"
      sx={{ p: '16px 18px', borderRadius: 2, borderColor: '#e2e8f0' }}
    >
      <Typography sx={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>
        {label}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width={72} height={28} />
      ) : (
        <Typography sx={{ fontSize: 20, fontWeight: 500, color: VARIANT_COLORS[variant], lineHeight: 1.2 }}>
          {value}
        </Typography>
      )}
      {!loading && subLabel && (
        <Typography sx={{ fontSize: 11, color: subColor, mt: 0.5 }}>{subLabel}</Typography>
      )}
    </Card>
  );
}
