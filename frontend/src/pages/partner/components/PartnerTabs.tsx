import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Box, Tab, Tabs } from '@mui/material';

interface TabSpec {
  value: string;
  label: string;
  to: string;
  params?: Record<string, string>;
}

interface PartnerTabsProps {
  tabs: TabSpec[];
  activeValue: string;
}

// Shared tab strip used across the partner area. Renders a white sub-bar below
// the PartnerHero. Each tab is its own route; clicking navigates instead of
// swapping content in place. The active tab is provided by the caller.
export default function PartnerTabs({ tabs, activeValue }: PartnerTabsProps) {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: 3 }}>
      <Box sx={{ maxWidth: 1152, mx: 'auto' }}>
        <Tabs
          value={activeValue}
          onChange={(_, next: string) => {
            const target = tabs.find((tab) => tab.value === next);
            if (!target || target.value === activeValue) return;
            navigate({ to: target.to, params: target.params } as Parameters<typeof navigate>[0]);
          }}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'uppercase',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.3,
            },
          }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Box>
    </Box>
  );
}

export type PartnerTabValue = 'resumen' | 'desembolsos' | 'propiedades' | 'equipo';

export function PartnerTopTabs({ active }: { active: PartnerTabValue }) {
  const { t } = useTranslation();
  return (
    <PartnerTabs
      activeValue={active}
      tabs={[
        { value: 'resumen', label: t('partner.tabs.resumen'), to: '/mi-hotel' },
        { value: 'desembolsos', label: t('partner.tabs.desembolsos'), to: '/mi-hotel/desembolsos' },
        { value: 'propiedades', label: t('partner.tabs.propiedades'), to: '/mi-hotel/propiedades' },
        { value: 'equipo', label: t('partner.tabs.equipo'), to: '/mi-hotel/equipo' },
      ]}
    />
  );
}

export type PropertyTabValue = 'resumen' | 'finanzas' | 'reservas' | 'habitaciones';

export function PropertyTabs({
  propertyId,
  active,
}: {
  propertyId: string;
  active: PropertyTabValue;
}) {
  const { t } = useTranslation();
  return (
    <PartnerTabs
      activeValue={active}
      tabs={[
        {
          value: 'resumen',
          label: t('partner.tabs.resumen'),
          to: '/mi-hotel/$propertyId',
          params: { propertyId },
        },
        {
          value: 'finanzas',
          label: t('partner.tabs.finanzas'),
          to: '/mi-hotel/$propertyId/finanzas',
          params: { propertyId },
        },
        {
          value: 'reservas',
          label: t('partner.tabs.reservas'),
          to: '/mi-hotel/$propertyId/reservas',
          params: { propertyId },
        },
        {
          value: 'habitaciones',
          label: t('partner.tabs.habitaciones'),
          to: '/mi-hotel/$propertyId/habitaciones',
          params: { propertyId },
        },
      ]}
    />
  );
}
