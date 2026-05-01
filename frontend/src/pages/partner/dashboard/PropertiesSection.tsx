import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Currency } from '../../../context/LocaleContext';
import { formatPrice } from '../../../utils/currency';
import { SectionHeader, StatusPill, TD, TH } from './ui';

export interface PropertyRow {
  propertyId: string;
  propertyName: string;
  loading: boolean;
  confirmed: number;
  gross: number;
  lastOccupancy: number | null;
}

interface PropertiesSectionProps {
  rows: PropertyRow[];
  currency: Currency;
  onView: (propertyId: string) => void;
}

interface RowMenu {
  el: HTMLElement;
  propertyId: string;
}

export default function PropertiesSection({ rows, currency, onView }: PropertiesSectionProps) {
  const { t } = useTranslation();
  const [rowMenu, setRowMenu] = useState<RowMenu | null>(null);
  return (
    <Box>
      <SectionHeader
        title={t('partner.org_dashboard.section_properties')}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={t('partner.org_dashboard.manager_coming_soon')}>
              <span>
                <Button
                  disabled
                  variant="contained"
                  size="small"
                  sx={{
                    fontSize: 12,
                    bgcolor: '#1B4F8C',
                    '&.Mui-disabled': { bgcolor: 'rgba(27,79,140,0.4)', color: 'white' },
                  }}
                >
                  {t('partner.org_dashboard.new_property_btn')}
                </Button>
              </span>
            </Tooltip>
          </Box>
        }
      />
      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TH width="20%">{t('partner.org_dashboard.col_property')}</TH>
                <TH>{t('partner.org_dashboard.col_status')}</TH>
                <TH>{t('partner.org_dashboard.col_manager')}</TH>
                <TH>{t('partner.org_dashboard.col_occupancy')}</TH>
                <TH align="right">{t('partner.org_dashboard.col_gross')}</TH>
                <TH align="right">{t('partner.org_dashboard.col_net_income')}</TH>
                <TH> </TH>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#6b7280', fontSize: 12 }}>
                    {t('partner.properties.no_properties')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.propertyId} sx={{ '&:hover': { bgcolor: '#F9FAFB' } }}>
                    <TD>
                      <Typography
                        onClick={() => onView(row.propertyId)}
                        sx={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', color: '#1B4F8C', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {row.propertyName}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: '#4a5568' }}>
                        {row.propertyId.slice(0, 8)}
                      </Typography>
                    </TD>
                    <TD>
                      <StatusPill active={row.confirmed > 0} />
                    </TD>
                    <TD>
                      <Typography sx={{ fontSize: 11, color: '#A32D2D' }}>
                        {t('partner.org_dashboard.no_manager')}
                      </Typography>
                    </TD>
                    <TD>
                      {row.loading ? (
                        '—'
                      ) : row.lastOccupancy !== null ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box sx={{ bgcolor: '#e2e8f0', borderRadius: '2px', height: 4, width: 48, flexShrink: 0 }}>
                            <Box
                              sx={{
                                bgcolor: row.lastOccupancy >= 70 ? '#3B6D11' : '#854F0B',
                                height: 4,
                                borderRadius: '2px',
                                width: `${Math.min(100, row.lastOccupancy)}%`,
                              }}
                            />
                          </Box>
                          <Typography sx={{ fontSize: 11, color: row.lastOccupancy >= 70 ? '#27500A' : '#854F0B' }}>
                            {Math.round(row.lastOccupancy)}%
                          </Typography>
                        </Box>
                      ) : '—'}
                    </TD>
                    <TD align="right">{row.loading ? '—' : formatPrice(row.gross, currency)}</TD>
                    <TD align="right" sx={{ color: '#3B6D11', fontWeight: 500 }}>
                      {row.loading ? '—' : formatPrice(row.gross * 0.8, currency)}
                    </TD>
                    <TD align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => setRowMenu({ el: e.currentTarget, propertyId: row.propertyId })}
                        sx={{ color: '#6b7280' }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TD>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Menu
        anchorEl={rowMenu?.el}
        open={Boolean(rowMenu)}
        onClose={() => setRowMenu(null)}
      >
        <MenuItem disabled onClick={() => setRowMenu(null)}>
          {t('partner.org_dashboard.assign_manager')}
        </MenuItem>
      </Menu>
    </Box>
  );
}
