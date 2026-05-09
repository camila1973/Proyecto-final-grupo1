import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ fontSize: 11, color: '#5a6a7e', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.75 }}>
      {children}
    </Typography>
  );
}

export function SidebarRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography sx={{ fontSize: 13, color: '#5a6a7e' }}>{label}</Typography>
      {children}
    </Stack>
  );
}

export function KpiBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, color: '#5a6a7e', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#1a2332', lineHeight: 1.2 }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: 11, color: '#5a6a7e' }}>{sub}</Typography>}
    </Box>
  );
}
