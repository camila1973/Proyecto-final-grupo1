import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Alert, Box } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../context/LocaleContext';
import {
  fetchPartnerProperties,
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

  const rows: PropertyRow[] = properties.map((p, i) => {
    const propData = propertyQueries[i]?.data;
    const loading = propertyQueries[i]?.isLoading ?? false;
    const propSeries = propData?.monthlySeries;
    return {
      propertyId: p.propertyId,
      propertyName: p.propertyName,
      loading,
      confirmed: propData?.metrics.confirmed ?? 0,
      gross: propData?.metrics.revenueUsd ?? 0,
      lastOccupancy: propSeries
        ? (propSeries[propSeries.length - 1]?.occupancyRate ?? 0) * 100
        : null,
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
