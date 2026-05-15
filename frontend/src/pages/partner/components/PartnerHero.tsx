import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import PageHero from '../../../components/PageHero';

interface PartnerHeroProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  titleAdornment?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

// Shared layout for every page-level hero in the partner area:
// eyebrow (label or breadcrumbs) → title (+ optional adornment) → subtitle → right-aligned actions.
// Builds on PageHero, which renders the brand-colored band + centered container.
export default function PartnerHero({
  eyebrow,
  title,
  titleAdornment,
  subtitle,
  actions,
}: PartnerHeroProps) {
  return (
    <PageHero>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          {eyebrow}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: eyebrow ? 0.5 : 0, mb: 0.25 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#fff' }}>
              {title}
            </Typography>
            {titleAdornment}
          </Box>
          {subtitle && (
            <Typography sx={{ fontSize: 12, color: '#fff', opacity: 0.85 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {actions}
          </Box>
        )}
      </Box>
    </PageHero>
  );
}

// Convenience for the standard "LABEL · code" eyebrow used by the dashboard
// and property hero banners.
export function HeroLabelEyebrow({
  label,
  code,
}: {
  label: string;
  code?: string;
}) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {label}
      {code && (
        <Box component="span" sx={{ textTransform: 'none', letterSpacing: 0, opacity: 0.7, fontWeight: 400 }}>
          {code}
        </Box>
      )}
    </Typography>
  );
}

// Eyebrow that renders a breadcrumb chain (e.g. Property › Rooms › Deluxe).
// Per-item `mono` renders that segment in monospace (used for ID codes).
export function HeroBreadcrumbEyebrow({
  items,
  separator = '›',
  onItemClick,
}: {
  items: Array<{ label: string; clickable?: boolean; mono?: boolean }>;
  separator?: string;
  onItemClick?: (index: number) => void;
}) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        flexWrap: 'wrap',
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const clickable = item.clickable && onItemClick;
        return (
          <Box component="span" key={`${item.label}-${i}`} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            {i > 0 && (
              <Box component="span" sx={{ opacity: 0.5 }}>
                {separator}
              </Box>
            )}
            <Box
              component="span"
              onClick={clickable ? () => onItemClick!(i) : undefined}
              sx={{
                color: isLast ? 'rgba(255,255,255,0.85)' : 'inherit',
                cursor: clickable ? 'pointer' : 'default',
                fontFamily: item.mono ? 'monospace' : 'inherit',
                textTransform: item.mono ? 'none' : 'inherit',
                letterSpacing: item.mono ? 0 : 'inherit',
                '&:hover': clickable ? { color: 'rgba(255,255,255,0.85)' } : undefined,
              }}
            >
              {item.label}
            </Box>
          </Box>
        );
      })}
    </Typography>
  );
}
