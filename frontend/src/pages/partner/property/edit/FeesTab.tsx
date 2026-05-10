import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Menu,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import {
  createPartnerFee,
  deletePartnerFee,
  updatePartnerFee,
  type PartnerCommission,
  type PartnerFee,
  type UpsertPartnerFeeInput,
} from '../../../../utils/queries';
import { KpiBlock } from './components';

interface FeesTabProps {
  fees: PartnerFee[];
  isLoading: boolean;
  isError: boolean;
  partnerId: string;
  propertyId: string;
  token: string;
  commission: PartnerCommission | null;
  commissionLoading: boolean;
}

type FeeType = PartnerFee['fee_type'];

interface FormState {
  feeName: string;
  feeType: FeeType;
  rate: string;
  flatAmount: string;
  currency: string;
}

const EMPTY_FORM: FormState = {
  feeName: '',
  feeType: 'PERCENTAGE',
  rate: '',
  flatAmount: '',
  currency: 'USD',
};

const today = () => new Date().toISOString().slice(0, 10);

function feeToForm(f: PartnerFee): FormState {
  return {
    feeName: f.fee_name,
    feeType: f.fee_type,
    rate: f.rate ?? '',
    flatAmount: f.flat_amount ?? '',
    currency: f.currency,
  };
}

export default function FeesTab({
  fees,
  isLoading,
  isError,
  partnerId,
  propertyId,
  token,
  commission,
  commissionLoading,
}: FeesTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState<{ mode: 'create' } | { mode: 'edit'; fee: PartnerFee } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [menuFor, setMenuFor] = useState<{ anchor: HTMLElement; fee: PartnerFee } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PartnerFee | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeFees = useMemo(() => fees.filter((f) => f.is_active), [fees]);
  const commissionDisplay = commission
    ? `${commission.ratePct.toFixed(2)}%`
    : commissionLoading
      ? '…'
      : '—';
  const globalCount = activeFees.filter((f) => !f.property_id).length;
  const propertyCount = activeFees.filter((f) => f.property_id === propertyId).length;
  const visibleFees = useMemo(
    () => (showInactive ? fees : fees.filter((f) => f.is_active)),
    [fees, showInactive],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['partner-fees', partnerId] });

  const createMutation = useMutation({
    mutationFn: (input: UpsertPartnerFeeInput) => createPartnerFee(input, token),
    onSuccess: () => {
      invalidate();
      setFormOpen(null);
      setSubmitError(null);
    },
    onError: () => setSubmitError(t('partner.properties.edit.fees.create_error')),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; input: UpsertPartnerFeeInput }) =>
      updatePartnerFee(vars.id, vars.input, token),
    onSuccess: () => {
      invalidate();
      setFormOpen(null);
      setSubmitError(null);
    },
    onError: () => setSubmitError(t('partner.properties.edit.fees.update_error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePartnerFee(id, token),
    onSuccess: () => {
      invalidate();
      setPendingDelete(null);
    },
  });

  const toggleActive = (fee: PartnerFee) => {
    updateMutation.mutate({
      id: fee.id,
      input: {
        partnerId,
        propertyId: fee.property_id,
        feeName: fee.fee_name,
        feeType: fee.fee_type,
        rate: fee.rate ? parseFloat(fee.rate) : null,
        flatAmount: fee.flat_amount ? parseFloat(fee.flat_amount) : null,
        currency: fee.currency,
        effectiveFrom: fee.effective_from,
        effectiveTo: fee.effective_to,
        isActive: !fee.is_active,
      },
    });
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSubmitError(null);
    setFormOpen({ mode: 'create' });
  };

  const openEdit = (fee: PartnerFee) => {
    setForm(feeToForm(fee));
    setSubmitError(null);
    setFormOpen({ mode: 'edit', fee });
  };

  const closeForm = () => {
    setFormOpen(null);
    setSubmitError(null);
  };

  const isPctType = form.feeType === 'PERCENTAGE';
  const numericValue = isPctType ? form.rate : form.flatAmount;
  const numericParsed = parseFloat(numericValue);
  const formValid =
    form.feeName.trim().length > 0 &&
    form.currency.trim().length === 3 &&
    Number.isFinite(numericParsed) &&
    numericParsed > 0;

  const submit = () => {
    if (!formOpen || !formValid) return;
    const base: UpsertPartnerFeeInput = {
      partnerId,
      propertyId: formOpen.mode === 'create' ? propertyId : (formOpen.fee.property_id ?? null),
      feeName: form.feeName.trim(),
      feeType: form.feeType,
      rate: isPctType ? numericParsed : null,
      flatAmount: isPctType ? null : numericParsed,
      currency: form.currency.trim().toUpperCase(),
      effectiveFrom: formOpen.mode === 'edit' ? formOpen.fee.effective_from : today(),
      effectiveTo: formOpen.mode === 'edit' ? formOpen.fee.effective_to : null,
      isActive: formOpen.mode === 'edit' ? formOpen.fee.is_active : true,
    };
    if (formOpen.mode === 'create') createMutation.mutate(base);
    else updateMutation.mutate({ id: formOpen.fee.id, input: base });
  };

  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1a2332' }}>{t('partner.properties.edit.fees.title')}</Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControlLabel
            control={<Switch size="small" checked={showInactive} onChange={(_, v) => setShowInactive(v)} />}
            label={<Typography sx={{ fontSize: 12 }}>{t('partner.properties.edit.fees.show_inactive')}</Typography>}
          />
          <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />} onClick={openCreate}>
            {t('partner.properties.edit.fees.new_fee')}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 2.5 }}>
        <KpiBlock
          label={t('partner.properties.edit.fees.kpi_commission')}
          value={commissionDisplay}
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

      {deleteMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => deleteMutation.reset()}>
          {t('partner.properties.edit.fees.delete_error')}
        </Alert>
      )}

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
                <TableCell sx={{ bgcolor: '#f7f9fc', width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleFees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3, fontSize: 12, color: '#6b7280' }}>
                    {t('partner.properties.edit.fees.no_fees')}
                  </TableCell>
                </TableRow>
              ) : (
                visibleFees.map((f) => {
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
                      <TableCell sx={{ width: 48, p: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => setMenuFor({ anchor: e.currentTarget, fee: f })}
                          disabled={deleteMutation.isPending && pendingDelete?.id === f.id}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu anchorEl={menuFor?.anchor ?? null} open={!!menuFor} onClose={() => setMenuFor(null)}>
        <MenuItem
          onClick={() => {
            if (menuFor) openEdit(menuFor.fee);
            setMenuFor(null);
          }}
          sx={{ fontSize: 13 }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          {t('partner.properties.edit.fees.action_edit')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFor) toggleActive(menuFor.fee);
            setMenuFor(null);
          }}
          sx={{ fontSize: 13 }}
        >
          {menuFor?.fee.is_active ? (
            <>
              <ToggleOffIcon fontSize="small" sx={{ mr: 1 }} />
              {t('partner.properties.edit.fees.action_disable')}
            </>
          ) : (
            <>
              <ToggleOnIcon fontSize="small" sx={{ mr: 1 }} />
              {t('partner.properties.edit.fees.action_enable')}
            </>
          )}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFor) setPendingDelete(menuFor.fee);
            setMenuFor(null);
          }}
          sx={{ color: 'error.main', fontSize: 13 }}
        >
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
          {t('partner.properties.edit.fees.action_delete_forever')}
        </MenuItem>
      </Menu>

      <Dialog open={!!formOpen} onClose={closeForm} maxWidth="xs" fullWidth>
        <DialogTitle>
          {formOpen?.mode === 'edit'
            ? t('partner.properties.edit.fees.form_edit_title')
            : t('partner.properties.edit.fees.form_create_title')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              label={t('partner.properties.edit.fees.form_name_label')}
              value={form.feeName}
              onChange={(e) => setForm((s) => ({ ...s, feeName: e.target.value }))}
              size="small"
              fullWidth
              autoFocus
            />
            <TextField
              select
              label={t('partner.properties.edit.fees.form_type_label')}
              value={form.feeType}
              onChange={(e) => setForm((s) => ({ ...s, feeType: e.target.value as FeeType }))}
              size="small"
              fullWidth
            >
              <MenuItem value="PERCENTAGE">{t('partner.properties.edit.fees.form_type_percentage')}</MenuItem>
              <MenuItem value="FLAT_PER_NIGHT">{t('partner.properties.edit.fees.form_type_per_night')}</MenuItem>
              <MenuItem value="FLAT_PER_STAY">{t('partner.properties.edit.fees.form_type_per_stay')}</MenuItem>
            </TextField>
            {isPctType ? (
              <TextField
                label={t('partner.properties.edit.fees.form_rate_label')}
                value={form.rate}
                onChange={(e) => setForm((s) => ({ ...s, rate: e.target.value }))}
                size="small"
                fullWidth
                inputMode="decimal"
              />
            ) : (
              <TextField
                label={t('partner.properties.edit.fees.form_flat_label')}
                value={form.flatAmount}
                onChange={(e) => setForm((s) => ({ ...s, flatAmount: e.target.value }))}
                size="small"
                fullWidth
                inputMode="decimal"
              />
            )}
            <TextField
              label={t('partner.properties.edit.fees.form_currency_label')}
              value={form.currency}
              onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))}
              size="small"
              fullWidth
              slotProps={{ htmlInput: { maxLength: 3 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm} disabled={submitting}>
            {t('partner.properties.edit.fees.form_cancel')}
          </Button>
          <Button variant="contained" onClick={submit} disabled={!formValid || submitting} loading={submitting}>
            {t('partner.properties.edit.fees.form_save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('partner.properties.edit.fees.delete_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingDelete && t('partner.properties.edit.fees.delete_body', { name: pendingDelete.fee_name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} disabled={deleteMutation.isPending}>
            {t('partner.properties.edit.fees.form_cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            loading={deleteMutation.isPending}
          >
            {t('partner.properties.edit.fees.delete_confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
