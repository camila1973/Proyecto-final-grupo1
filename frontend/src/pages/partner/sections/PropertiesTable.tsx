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
  managerName: string | null;
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

function IdCell({ propertyId }: { propertyId: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(propertyId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard API blocked
    }
  };

  return (
    <Tooltip
      title={copied ? t('partner.org_dashboard.id_copied') : `${propertyId} · ${t('partner.org_dashboard.copy_id_hint')}`}
      placement="top"
      arrow
    >
      <Typography
        component="span"
        onClick={handleCopy}
        sx={{
          fontSize: 11,
          fontFamily: 'monospace',
          color: '#4a5568',
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { color: '#1B4F8C' },
        }}
      >
        {propertyId.slice(0, 8)}
      </Typography>
    </Tooltip>
  );
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
                <TH width="22%">{t('partner.org_dashboard.col_property')}</TH>
                <TH width="11%">{t('partner.org_dashboard.col_id')}</TH>
                <TH>{t('partner.org_dashboard.col_status')}</TH>
                <TH>{t('partner.org_dashboard.col_manager')}</TH>
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
                    </TD>
                    <TD>
                      <IdCell propertyId={row.propertyId} />
                    </TD>
                    <TD>
                      <StatusPill active={row.confirmed > 0} />
                    </TD>
                    <TD>
                      {row.managerName ? (
                        <Typography sx={{ fontSize: 12, color: '#1a1a1a' }}>
                          {row.managerName}
                        </Typography>
                      ) : (
                        <Typography sx={{ fontSize: 11, color: '#A32D2D' }}>
                          {t('partner.org_dashboard.no_manager')}
                        </Typography>
                      )}
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
