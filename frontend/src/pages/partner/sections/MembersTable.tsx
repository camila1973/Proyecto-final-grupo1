import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
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
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { fetchPartnerMembers, type PartnerMember } from '../../../utils/queries';
import { SectionHeader, TD, TH } from './ui';

interface MembersSectionProps {
  partnerId: string;
  token: string;
}

interface RowMenu {
  el: HTMLElement;
  memberId: string;
}

function RoleChip({ role, t }: { role: string; t: (k: string) => string }) {
  if (role === 'partner') {
    return (
      <Chip
        label={t('partner.org_dashboard.roles.partner')}
        size="small"
        sx={{ fontSize: 11, height: 20, bgcolor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
      />
    );
  }
  return (
    <Chip
      label={t('partner.org_dashboard.roles.manager')}
      size="small"
      sx={{ fontSize: 11, height: 20, bgcolor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB' }}
    />
  );
}

function StatusChip({ status, t }: { status: string; t: (k: string) => string }) {
  const isActive = status === 'active';
  return (
    <Chip
      label={isActive
        ? t('partner.org_dashboard.member_status_active')
        : t('partner.org_dashboard.member_status_inactive')}
      size="small"
      sx={isActive
        ? { fontSize: 11, height: 20, bgcolor: '#EAF3DE', color: '#27500A', border: '1px solid #97C459' }
        : { fontSize: 11, height: 20, bgcolor: '#F3F4F6', color: '#6B7280', border: '1px solid #D1D5DB' }}
    />
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fullName(m: PartnerMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ');
  return name || '—';
}

export default function MembersSection({ partnerId, token }: MembersSectionProps) {
  const { t } = useTranslation();
  const [rowMenu, setRowMenu] = useState<RowMenu | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['partner-members', partnerId],
    queryFn: () => fetchPartnerMembers(partnerId, token),
    enabled: !!partnerId && !!token,
  });

  return (
    <Box>
      <SectionHeader
        title={t('partner.org_dashboard.section_managers')}
        action={
          <Tooltip title={t('partner.org_dashboard.manager_coming_soon')}>
            <span>
              <Button
                disabled
                variant="outlined"
                size="small"
                sx={{
                  fontSize: 12,
                  color: '#1B4F8C',
                  borderColor: '#1B4F8C',
                  '&.Mui-disabled': { color: 'rgba(27,79,140,0.4)', borderColor: 'rgba(27,79,140,0.3)' },
                }}
              >
                {t('partner.org_dashboard.invite_manager')}
              </Button>
            </span>
          </Tooltip>
        }
      />

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TH width="20%">{t('partner.org_dashboard.col_full_name')}</TH>
                <TH>{t('partner.org_dashboard.col_status')}</TH>
                <TH>{t('partner.org_dashboard.col_role')}</TH>
                <TH>{t('partner.org_dashboard.col_email')}</TH>
                <TH>{t('partner.org_dashboard.col_created_at')}</TH>
                <TH>{t('partner.org_dashboard.col_last_signed_in')}</TH>
                <TH> </TH>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={20} />
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{ fontSize: 12, color: '#6b7280', py: 3 }}
                  >
                    {t('partner.properties.no_properties')}
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.id} sx={{ '&:hover': { bgcolor: '#F9FAFB' } }}>
                    <TD>{fullName(m)}</TD>
                    <TD><StatusChip status={m.status} t={t} /></TD>
                    <TD><RoleChip role={m.role} t={t} /></TD>
                    <TD sx={{ color: '#374151' }}>{m.email}</TD>
                    <TD sx={{ color: '#374151' }}>{formatDate(m.createdAt)}</TD>
                    <TD sx={{ color: m.lastLoginAt ? '#374151' : '#9ca3af' }}>
                      {m.lastLoginAt ? formatDateTime(m.lastLoginAt) : '—'}
                    </TD>
                    <TD align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => setRowMenu({ el: e.currentTarget, memberId: m.id })}
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
        <MenuItem
          disabled
        >
          {t('partner.org_dashboard.action_reset_password')}
        </MenuItem>
        <MenuItem
          disabled
        >
          {t('partner.org_dashboard.action_delete')}
        </MenuItem>
      </Menu>
    </Box>
  );
}
