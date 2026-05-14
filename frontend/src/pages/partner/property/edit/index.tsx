import { useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../../../hooks/useAuth';
import PageContainer from '../../../../components/PageContainer';
import PartnerHero, { HeroBreadcrumbEyebrow } from '../../components/PartnerHero';
import {
  fetchInventoryProperty,
  fetchPartnerCommission,
  fetchPartnerFees,
  fetchTaxRulesByCountry,
  updateInventoryProperty,
  type UpdatePropertyBody,
} from '../../../../utils/queries';
import { COUNTRY_OPTIONS, fromProperty, toBody, type FormState, type TabId } from './shared';
import InfoTab from './InfoTab';
import TaxTab from './TaxTab';
import FeesTab from './FeesTab';
import MediaTab from './MediaTab';
import QrTab from './QrTab';

export default function PropertyEditPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { propertyId } = useParams({ from: '/mi-hotel/$propertyId/editar' });
  const { tab } = useSearch({ from: '/mi-hotel/$propertyId/editar' });

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;

  const setTab = (next: TabId) =>
    navigate({ to: '/mi-hotel/$propertyId/editar', params: { propertyId }, search: { tab: next }, replace: true });

  const [form, setForm] = useState<FormState | null>(null);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  const propertyQuery = useQuery({
    queryKey: ['inventory-property', propertyId],
    queryFn: () => fetchInventoryProperty(propertyId, token!),
    enabled,
  });

  if (propertyQuery.data && seededFor !== propertyQuery.data.updatedAt) {
    setSeededFor(propertyQuery.data.updatedAt);
    setForm(fromProperty(propertyQuery.data));
  }

  const property = propertyQuery.data ?? null;
  const country = property?.countryCode ?? '';
  const partnerForFees = property?.partnerId ?? partnerId;

  const taxRulesQuery = useQuery({
    queryKey: ['tax-rules', country],
    queryFn: () => fetchTaxRulesByCountry(country, token!),
    enabled: enabled && tab === 'tax' && !!country,
  });

  const feesQuery = useQuery({
    queryKey: ['partner-fees', partnerForFees],
    queryFn: () => fetchPartnerFees(partnerForFees, token!),
    enabled: enabled && tab === 'fees' && !!partnerForFees,
  });

  const commissionQuery = useQuery({
    queryKey: ['partner-commission', partnerForFees],
    queryFn: () => fetchPartnerCommission(partnerForFees, token!),
    enabled: enabled && tab === 'fees' && !!partnerForFees,
  });

  const updateMutation = useMutation({
    mutationFn: (body: UpdatePropertyBody) => updateInventoryProperty(propertyId, body, token!),
    onSuccess: (data) => {
      queryClient.setQueryData(['inventory-property', propertyId], data);
      setForm(fromProperty(data));
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (status: 'active' | 'paused') => updateInventoryProperty(propertyId, { status }, token!),
    onSuccess: (data) => {
      queryClient.setQueryData(['inventory-property', propertyId], data);
    },
  });

  if (!enabled) {
    return (
      <PageContainer>
        <Alert severity="info">{t('partner.properties.edit.login_required')}</Alert>
      </PageContainer>
    );
  }

  if (propertyQuery.isError) {
    return (
      <PageContainer>
        <Alert severity="error">{t('partner.properties.edit.load_error')}</Alert>
      </PageContainer>
    );
  }

  if (!property || !form) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const onSave = () => updateMutation.mutate(toBody(form));
  const onBack = () => navigate({ to: '/mi-hotel/$propertyId', params: { propertyId } });

  return (
    <Box sx={{ bgcolor: '#F5F7FA', minHeight: '100vh' }}>
      <PartnerHero
        eyebrow={
          <HeroBreadcrumbEyebrow
            separator="/"
            items={[
              { label: propertyId.slice(0, 8), mono: true },
              { label: t('partner.properties.edit.breadcrumb') },
            ]}
          />
        }
        title={t('partner.properties.edit.page_title')}
        subtitle={`${property.name} · ${[property.neighborhood, property.city, property.countryCode].filter(Boolean).join(', ')}`}
        actions={
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={onBack}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            {t('partner.properties.edit.back')}
          </Button>
        }
      />

      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: 3 }}>
        <Box sx={{ maxWidth: 1152, mx: 'auto' }}>
          <Tabs
            value={tab}
            onChange={(_, v: TabId) => setTab(v)}
            sx={{ '& .MuiTab-root': { textTransform: 'uppercase', fontSize: 13, fontWeight: 600, letterSpacing: 0.3 } }}
          >
            <Tab value="info" label={t('partner.properties.edit.tabs.info')} />
            <Tab value="tax" label={t('partner.properties.edit.tabs.tax')} />
            <Tab value="fees" label={t('partner.properties.edit.tabs.fees')} />
            <Tab value="media" label={t('partner.properties.edit.tabs.media')} />
            <Tab value="qr" label={t('partner.properties.edit.tabs.qr')} />
          </Tabs>
        </Box>
      </Box>

      <PageContainer>
        {tab === 'info' && (
          <InfoTab
            form={form}
            setForm={setForm}
            property={property}
            onPause={() => pauseMutation.mutate(property.status === 'paused' ? 'active' : 'paused')}
            pausing={pauseMutation.isPending}
            onSave={onSave}
            saving={updateMutation.isPending}
          />
        )}
        {tab === 'tax' && (
          <TaxTab
            country={property.countryCode}
            countryLabel={COUNTRY_OPTIONS.find((c) => c.code === property.countryCode)?.name ?? property.countryCode}
            city={property.city}
            rules={taxRulesQuery.data ?? []}
            isLoading={taxRulesQuery.isLoading}
            isError={taxRulesQuery.isError}
          />
        )}
        {tab === 'fees' && (
          <FeesTab
            fees={feesQuery.data ?? []}
            isLoading={feesQuery.isLoading}
            isError={feesQuery.isError}
            partnerId={partnerForFees}
            propertyId={propertyId}
            token={token!}
            commission={commissionQuery.data ?? null}
            commissionLoading={commissionQuery.isLoading}
          />
        )}
        {tab === 'media' && <MediaTab thumbnailUrl={property.thumbnailUrl} />}
        {tab === 'qr' && <QrTab propertyId={propertyId} />}
      </PageContainer>
    </Box>
  );
}
