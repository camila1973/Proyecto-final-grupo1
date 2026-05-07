import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Currency } from '../../../context/LocaleContext';
import { formatPrice } from '../../../utils/currency';
import { SectionHeader, TD, TH } from './ui';

export interface PropertyDisbursementRow {
  propertyId: string;
  propertyName: string;
  gross: number;
  commission: number;
  taxes: number;
  net: number;
}

interface DisbursementsSectionProps {
  rows: PropertyDisbursementRow[];
  month: string;
  currency: Currency;
  disbursementLabel: string;
  totalNetPayout: number;
  onViewHistory: () => void;
}

export default function DisbursementsSection({
  rows,
  month,
  currency,
  disbursementLabel,
  totalNetPayout,
  onViewHistory,
}: DisbursementsSectionProps) {
  const { t } = useTranslation();
  return (
    <Box id="disbursements">
      <SectionHeader
        title={t('partner.org_dashboard.section_disbursements')}
        action={
          <Button
            size="small"
            variant="text"
            sx={{ fontSize: 12, color: '#4a5568' }}
            onClick={onViewHistory}
          >
            {t('partner.org_dashboard.see_full_history')}
          </Button>
        }
      />
      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TH>{t('partner.org_dashboard.col_period')}</TH>
                <TH>{t('partner.org_dashboard.col_property_name')}</TH>
                <TH align="right">{t('partner.org_dashboard.col_gross_amount')}</TH>
                <TH align="right">{t('partner.org_dashboard.col_commission_20')}</TH>
                <TH align="right">{t('partner.org_dashboard.col_taxes')}</TH>
                <TH align="right">{t('partner.org_dashboard.col_net_amount')}</TH>
                <TH>{t('partner.org_dashboard.col_disbursement_date')}</TH>
                <TH>{t('partner.org_dashboard.col_disp_status')}</TH>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, color: '#6b7280', fontSize: 12 }}>
                    {t('partner.org_dashboard.no_disbursements')}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {rows.map((row) => (
                    <TableRow key={row.propertyId}>
                      <TD sx={{ fontSize: 11, color: '#4a5568' }}>{month}</TD>
                      <TD sx={{ fontWeight: 500 }}>{row.propertyName || '—'}</TD>
                      <TD align="right">{formatPrice(row.gross, currency)}</TD>
                      <TD align="right" sx={{ color: '#A32D2D' }}>
                        {formatPrice(-row.commission, currency)}
                      </TD>
                      <TD align="right" sx={{ color: '#4a5568' }}>
                        {formatPrice(-row.taxes, currency)}
                      </TD>
                      <TD align="right" sx={{ color: '#3B6D11', fontWeight: 500 }}>
                        {formatPrice(row.net, currency)}
                      </TD>
                      <TD sx={{ fontSize: 11 }}>{disbursementLabel}</TD>
                      <TD>
                        <Chip
                          size="small"
                          label={t('partner.org_dashboard.status_pending')}
                          sx={{
                            fontSize: 11,
                            bgcolor: '#FFF8E5',
                            color: '#633806',
                            border: '1px solid #F5C842',
                            height: 22,
                          }}
                        />
                      </TD>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#F5F7FA' }}>
                    <TableCell colSpan={5} sx={{ fontSize: 12, fontWeight: 500, py: '12px', px: '14px' }}>
                      {t('partner.org_dashboard.total_label', { date: disbursementLabel })}
                    </TableCell>
                    <TD align="right" sx={{ fontSize: 14, fontWeight: 500, color: '#1B4F8C' }}>
                      {formatPrice(totalNetPayout, currency)}
                    </TD>
                    <TD>{null}</TD>
                    <TD>{null}</TD>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
