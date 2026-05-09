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
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { TaxRule } from '../../../../utils/queries';
import { KpiBlock } from './components';

interface TaxTabProps {
  country: string;
  countryLabel: string;
  city: string;
  rules: TaxRule[];
  isLoading: boolean;
  isError: boolean;
}

export default function TaxTab({ country, countryLabel, city, rules, isLoading, isError }: TaxTabProps) {
  const { t } = useTranslation();
  const visibleRules = useMemo(
    () => rules.filter((r) => r.city === null || r.city.toLowerCase() === city.toLowerCase()),
    [rules, city],
  );

  const effectiveRate = useMemo(
    () =>
      visibleRules
        .filter((r) => r.is_active && r.tax_type === 'PERCENTAGE')
        .reduce((acc, r) => acc + parseFloat(r.rate ?? '0'), 0),
    [visibleRules],
  );

  return (
    <Paper variant="outlined" sx={{ p: 3, borderColor: '#e2e8f0', borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1a2332' }}>
          {t('partner.properties.edit.tax.title', { city, country: countryLabel })}
        </Typography>
        <Tooltip title={t('partner.properties.edit.coming_soon')}>
          <span>
            <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />} disabled>
              {t('partner.properties.edit.tax.new_rule')}
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />} sx={{ fontSize: 12.5, mb: 2 }}>
        {t('partner.properties.edit.tax.banner', { city })}
      </Alert>

      {isLoading && <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>}
      {isError && <Alert severity="error">{t('partner.properties.edit.tax.load_error')}</Alert>}
      {!isLoading && !isError && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  t('partner.properties.edit.tax.col_name'),
                  t('partner.properties.edit.tax.col_type'),
                  t('partner.properties.edit.tax.col_rate'),
                  t('partner.properties.edit.tax.col_flat'),
                  t('partner.properties.edit.tax.col_currency'),
                  t('partner.properties.edit.tax.col_country'),
                  t('partner.properties.edit.tax.col_city'),
                  t('partner.properties.edit.tax.col_status'),
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
              {visibleRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, fontSize: 12, color: '#6b7280' }}>
                    {t('partner.properties.edit.tax.no_rules', { city })}
                  </TableCell>
                </TableRow>
              ) : (
                visibleRules.map((r) => {
                  const isPct = r.tax_type === 'PERCENTAGE';
                  return (
                    <TableRow key={r.id}>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{r.tax_name}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={isPct ? t('partner.properties.edit.tax.type_percentage') : t('partner.properties.edit.tax.type_flat')}
                          sx={{ fontSize: 10.5, height: 22, bgcolor: isPct ? '#e3f2fd' : '#fff5cc', color: isPct ? '#0288d1' : '#7d5e00', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {r.rate ? `${parseFloat(r.rate).toFixed(2)}%` : '—'}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {r.flat_amount ? `$ ${parseFloat(r.flat_amount).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.currency}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.country}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.city ?? t('partner.properties.edit.tax.all_cities')}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={r.is_active ? t('partner.properties.edit.tax.status_active') : t('partner.properties.edit.tax.status_inactive')}
                          sx={{
                            fontSize: 10.5,
                            height: 22,
                            bgcolor: r.is_active ? '#dcfce7' : '#f1f5f9',
                            color: r.is_active ? '#166534' : '#475569',
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

      <Box
        sx={{
          mt: 2.5,
          p: 2,
          bgcolor: '#f7f9fc',
          borderRadius: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <KpiBlock
          label={t('partner.properties.edit.tax.kpi_effective')}
          value={`${effectiveRate.toFixed(2)}%`}
          sub={t('partner.properties.edit.tax.kpi_effective_sub')}
        />
        <KpiBlock
          label={t('partner.properties.edit.tax.kpi_active_count')}
          value={String(visibleRules.filter((r) => r.is_active).length)}
          sub={t('partner.properties.edit.tax.kpi_active_count_sub', { city })}
        />
        <KpiBlock label={t('partner.properties.edit.tax.kpi_country')} value={countryLabel} sub={country} />
      </Box>
    </Paper>
  );
}
