import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Alert, Box } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../context/LocaleContext';
import {
  fetchPartnerProperties,
  fetchPartnerMembers,
  fetchPropertyMetrics,
} from '../../utils/queries';
import { currentMonth } from '../../utils/month';
import PageContainer from '../../components/PageContainer';
import MonthSwitcher from './components/MonthSwitcher';
import PropertiesSection, { type PropertyRow } from './sections/PropertiesTable';

export default function PropertiesBody() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { language, currency } = useLocale();

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;
  const [month, setMonth] = useState(currentMonth());

  const propertiesQuery = useQuery({
    queryKey: ['partner-properties', partnerId],
    queryFn: () => fetchPartnerProperties(partnerId, token!),
    enabled,
  });

  const membersQuery = useQuery({
    queryKey: ['partner-members', partnerId],
    queryFn: () => fetchPartnerMembers(partnerId, token!),
    enabled,
  });

  const propertyQueries = useQueries({
    queries: (propertiesQuery.data?.properties ?? []).map((p) => ({
      queryKey: ['property-metrics', partnerId, p.propertyId, month],
      queryFn: () => fetchPropertyMetrics(partnerId, p.propertyId, month, null, token!),
      enabled: enabled && !!propertiesQuery.data,
    })),
  });

  if (!enabled) {
    return (
      <PageContainer>
        <Alert severity="info">{t('partner.org_dashboard.login_required')}</Alert>
      </PageContainer>
    );
  }

  const properties = propertiesQuery.data?.properties ?? [];
  const members = membersQuery.data ?? [];

  const managerByProperty = new Map<string, string>();
  for (const m of members) {
    if (m.role !== 'manager' || !m.propertyId) continue;
    if (managerByProperty.has(m.propertyId)) continue;
    const fullName = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
    managerByProperty.set(m.propertyId, fullName || m.email);
  }

  const rows: PropertyRow[] = properties.map((p, i) => {
    const propData = propertyQueries[i]?.data;
    const loading = propertyQueries[i]?.isLoading ?? false;
    return {
      propertyId: p.propertyId,
      propertyName: p.propertyName,
      loading,
      confirmed: propData?.metrics.confirmed ?? 0,
      gross: propData?.metrics.revenueUsd ?? 0,
      managerName: managerByProperty.get(p.propertyId) ?? null,
    };
  });

  return (
    <PageContainer>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <MonthSwitcher month={month} onChange={setMonth} language={language} />
      </Box>
      <PropertiesSection
        rows={rows}
        currency={currency}
        onView={(propertyId) =>
          navigate({ to: '/mi-hotel/$propertyId', params: { propertyId }, search: { tab: 'resumen' } })
        }
      />
    </PageContainer>
  );
}
