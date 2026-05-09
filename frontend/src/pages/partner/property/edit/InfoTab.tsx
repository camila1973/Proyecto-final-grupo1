import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import LinkIcon from '@mui/icons-material/Link';
import BlockIcon from '@mui/icons-material/Block';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { InventoryProperty } from '../../../../utils/queries';
import {
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  type FormState,
  TIMEZONE_OPTIONS,
} from './shared';
import { FieldLabel, SidebarRow } from './components';

interface InfoTabProps {
  form: FormState;
  setForm: (next: FormState) => void;
  property: InventoryProperty;
  onPause: () => void;
  pausing: boolean;
  onSave: () => void;
  saving: boolean;
}

export default function InfoTab({ form, setForm, property, onPause, pausing, onSave, saving }: InfoTabProps) {
  const { t } = useTranslation();
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm({ ...form, [key]: value });
  const isPaused = property.status === 'paused';
  const navigate = useNavigate();

  const onCopyLink = () => {
    const link = `${window.location.origin}/#/properties/${property.id}`;
    navigator.clipboard.writeText(link).catch(() => {
      /* clipboard unavailable */
    });
  };
  const goQr = () => navigate({ to: '/mi-hotel/$propertyId/qr', params: { propertyId: property.id } });

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 3 }}>
      <Paper variant="outlined" sx={{ p: 3, borderColor: '#e2e8f0', borderRadius: 2 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1a2332', mb: 2 }}>
          {t('partner.properties.edit.info.section_title')}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            <FieldLabel>{t('partner.properties.edit.info.name')}</FieldLabel>
            <TextField fullWidth size="small" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </Box>

          <Box>
            <FieldLabel>{t('partner.properties.edit.info.phone')}</FieldLabel>
            <TextField fullWidth size="small" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </Box>

          <Box>
            <FieldLabel>{t('partner.properties.edit.info.email')}</FieldLabel>
            <TextField fullWidth size="small" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </Box>

          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            <FieldLabel>{t('partner.properties.edit.info.address')}</FieldLabel>
            <TextField fullWidth size="small" value={form.address} onChange={(e) => update('address', e.target.value)} />
          </Box>

          <Box>
            <FieldLabel>{t('partner.properties.edit.info.country')}</FieldLabel>
            <TextField select fullWidth size="small" value={form.countryCode} onChange={(e) => update('countryCode', e.target.value)}>
              {COUNTRY_OPTIONS.map((c) => (
                <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <FieldLabel>{t('partner.properties.edit.info.city')}</FieldLabel>
            <TextField fullWidth size="small" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </Box>

          <Box>
            <FieldLabel>{t('partner.properties.edit.info.currency')}</FieldLabel>
            <TextField select fullWidth size="small" value={form.currency} onChange={(e) => update('currency', e.target.value)}>
              <MenuItem value=""><em>—</em></MenuItem>
              {CURRENCY_OPTIONS.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <FieldLabel>{t('partner.properties.edit.info.timezone')}</FieldLabel>
            <TextField select fullWidth size="small" value={form.timezone} onChange={(e) => update('timezone', e.target.value)}>
              <MenuItem value=""><em>—</em></MenuItem>
              {TIMEZONE_OPTIONS.map((tz) => (
                <MenuItem key={tz} value={tz}>{tz}</MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            <FieldLabel>{t('partner.properties.edit.info.description')}</FieldLabel>
            <TextField
              fullWidth
              multiline
              minRows={4}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </Box>
        </Box>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3, pt: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button
            variant="contained"
            startIcon={<CheckIcon fontSize="small" />}
            onClick={onSave}
            loading={saving}
          >
            {t('partner.properties.edit.save')}
          </Button>
        </Stack>
      </Paper>

      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2.5, borderColor: '#e2e8f0', borderRadius: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1a2332', mb: 1.5 }}>{t('partner.properties.edit.info.sidebar.status_title')}</Typography>
          <Stack spacing={1.25}>
            <SidebarRow label={t('partner.properties.edit.info.sidebar.visibility')}>
              <Chip
                size="small"
                label={isPaused ? t('partner.properties.edit.info.sidebar.visibility_paused') : t('partner.properties.edit.info.sidebar.visibility_public')}
                sx={{
                  fontSize: 11,
                  height: 22,
                  fontWeight: 600,
                  bgcolor: isPaused ? '#fef3c7' : '#dcfce7',
                  color: isPaused ? '#92400e' : '#166534',
                }}
              />
            </SidebarRow>
            <SidebarRow label={t('partner.properties.edit.info.sidebar.type')}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{property.type || '—'}</Typography>
            </SidebarRow>
            <SidebarRow label={t('partner.properties.edit.info.sidebar.property_id')}>
              <Typography sx={{ fontSize: 12, fontFamily: 'monospace' }}>{property.id.slice(0, 8)}</Typography>
            </SidebarRow>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, borderColor: '#e2e8f0', borderRadius: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1a2332', mb: 1.5 }}>{t('partner.properties.edit.info.sidebar.actions_title')}</Typography>
          <Stack spacing={1}>
            <Button variant="outlined" size="small" startIcon={<QrCode2Icon fontSize="small" />} onClick={goQr} fullWidth>
              {t('partner.properties.edit.info.sidebar.download_qr')}
            </Button>
            <Button variant="outlined" size="small" startIcon={<LinkIcon fontSize="small" />} onClick={onCopyLink} fullWidth>
              {t('partner.properties.edit.info.sidebar.copy_link')}
            </Button>
            <Button
              variant="outlined"
              color={isPaused ? 'success' : 'error'}
              size="small"
              startIcon={isPaused ? <PlayArrowIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
              onClick={onPause}
              loading={pausing}
              fullWidth
            >
              {isPaused ? t('partner.properties.edit.info.sidebar.resume_listing') : t('partner.properties.edit.info.sidebar.pause_listing')}
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
