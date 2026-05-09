import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { PartnerFee } from '../../../../utils/queries';
import { KpiBlock } from './components';

interface FeesTabProps {
  fees: PartnerFee[];
  isLoading: boolean;
  isError: boolean;
  propertyId: string;
}

export default function FeesTab({ fees, isLoading, isError, propertyId }: FeesTabProps) {
  const { t } = useTranslation();
  const activeFees = useMemo(() => fees.filter((f) => f.is_active), [fees]);
  const commission = useMemo(() => {
    const pct = activeFees.find((f) => f.fee_type === 'PERCENTAGE');
    return pct?.rate ? `${parseFloat(pct.rate).toFixed(2)}%` : '—';
  }, [activeFees]);
  const globalCount = activeFees.filter((f) => !f.property_id).length;
  const propertyCount = activeFees.filter((f) => f.property_id === propertyId).length;

  return (
    <Paper variant="outlined" sx={{ p: 3, borderColor: '#e2e8f0', borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1a2332' }}>{t('partner.properties.edit.fees.title')}</Typography>
        <Tooltip title={t('partner.properties.edit.coming_soon')}>
          <span>
            <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />} disabled>
              {t('partner.properties.edit.fees.new_fee')}
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 2.5 }}>
        <KpiBlock
          label={t('partner.properties.edit.fees.kpi_commission')}
          value={commission}
          sub={t('partner.properties.edit.fees.kpi_commission_sub')}
        />
        <KpiBlock
          label={t('partner.properties.edit.fees.kpi_active')}
          value={String(activeFees.length)}
          sub={t('partner.properties.edit.fees.kpi_active_sub', { global: globalCount, property: propertyCount })}
        />
        <KpiBlock
          label={t('partner.properties.edit.fees.kpi_total')}
          value={String(fees.length)}
          sub={t('partner.properties.edit.fees.kpi_total_sub')}
        />
      </Box>

      {isLoading && <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>}
      {isError && <Alert severity="error">{t('partner.properties.edit.fees.load_error')}</Alert>}
      {!isLoading && !isError && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  t('partner.properties.edit.fees.col_name'),
                  t('partner.properties.edit.fees.col_type'),
                  t('partner.properties.edit.fees.col_rate'),
                  t('partner.properties.edit.fees.col_flat'),
                  t('partner.properties.edit.fees.col_currency'),
                  t('partner.properties.edit.fees.col_scope'),
                  t('partner.properties.edit.fees.col_status'),
                ].map((h) => (
                  <TableCell
                    key={h}
                    sx={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, color: '#5a6a7e', bgcolor: '#f7f9fc' }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {fees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3, fontSize: 12, color: '#6b7280' }}>
                    {t('partner.properties.edit.fees.no_fees')}
                  </TableCell>
                </TableRow>
              ) : (
                fees.map((f) => {
                  const isPct = f.fee_type === 'PERCENTAGE';
                  const isGlobal = !f.property_id;
                  return (
                    <TableRow key={f.id}>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{f.fee_name}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={isPct ? t('partner.properties.edit.fees.type_commission') : t('partner.properties.edit.fees.type_flat')}
                          sx={{ fontSize: 10.5, height: 22, bgcolor: isPct ? '#dcfce7' : '#fff5cc', color: isPct ? '#166534' : '#7d5e00', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {f.rate ? `${parseFloat(f.rate).toFixed(2)}%` : '—'}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {f.flat_amount ? `$ ${parseFloat(f.flat_amount).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{f.currency}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={isGlobal ? t('partner.properties.edit.fees.scope_global') : t('partner.properties.edit.fees.scope_property')}
                          sx={{ fontSize: 10.5, height: 22, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={f.is_active ? t('partner.properties.edit.fees.status_active') : t('partner.properties.edit.fees.status_inactive')}
                          sx={{
                            fontSize: 10.5,
                            height: 22,
                            bgcolor: f.is_active ? '#dcfce7' : '#f1f5f9',
                            color: f.is_active ? '#166534' : '#475569',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
