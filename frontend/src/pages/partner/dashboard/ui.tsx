import { Box, Chip, Paper, TableCell, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

// ─── OrgMetricCard ────────────────────────────────────────────────────────────

export interface OrgMetricCardProps {
  label: string;
  value: string;
  subLabel?: string;
  subColor?: string;
}

export function OrgMetricCard({ label, value, subLabel, subColor = '#4a5568' }: OrgMetricCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: '16px 18px', borderRadius: 2, borderColor: '#e2e8f0', bgcolor: 'white' }}
    >
      <Typography sx={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.2 }}>
        {value}
      </Typography>
      {subLabel && (
        <Typography sx={{ fontSize: 11, color: subColor, mt: 0.5 }}>{subLabel}</Typography>
      )}
    </Paper>
  );
}

// ─── StatusPill ───────────────────────────────────────────────────────────────

export function StatusPill({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <Chip
      size="small"
      label={active ? t('partner.org_dashboard.status_active') : t('partner.org_dashboard.status_incomplete')}
      sx={{
        fontSize: 11,
        fontWeight: 500,
        bgcolor: active ? '#EAF3DE' : '#FFF8E5',
        color: active ? '#27500A' : '#633806',
        border: `1px solid ${active ? '#97C459' : '#F5C842'}`,
        height: 22,
      }}
    />
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{title}</Typography>
      {action}
    </Box>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────

export function TH({ children, align, width }: { children: React.ReactNode; align?: 'left' | 'right'; width?: string | number }) {
  return (
    <TableCell
      align={align}
      sx={{ width,
        fontSize: 10,
        fontWeight: 500,
        color: '#4a5568',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        bgcolor: '#F5F7FA',
        py: 1,
        px: '14px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </TableCell>
  );
}

export function TD({
  children,
  align,
  sx: sxProp,
}: {
  children: React.ReactNode;
  align?: 'right';
  sx?: object;
}) {
  return (
    <TableCell
      align={align}
      sx={{ fontSize: 12, py: '12px', px: '14px', color: '#1a1a1a', ...sxProp }}
    >
      {children}
    </TableCell>
  );
}
