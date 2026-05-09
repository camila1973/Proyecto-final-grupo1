import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTranslation } from 'react-i18next';
import { formatRatePeriodRange, groupRatePeriods, type RatePlanRow } from './roomRatePlan';
import { formatPrice } from '../../../../utils/currency';
import type { Currency } from '../../../../context/LocaleContext';
import type { RoomRatePeriod } from '../../../../utils/queries';

interface RatePlanCardProps {
  basePriceUsd: number;
  rates: RoomRatePeriod[];
  currency: Currency;
  onNewRate: () => void;
  onEdit?: (row: RatePlanRow) => void;
  onDelete?: (rateId: string) => void;
  deletingRateId?: string | null;
}

export default function RatePlanCard({
  basePriceUsd,
  rates,
  currency,
  onNewRate,
  onEdit,
  onDelete,
  deletingRateId = null,
}: RatePlanCardProps) {
  const { t } = useTranslation();
  const rows = groupRatePeriods(rates, basePriceUsd);
  const [menuFor, setMenuFor] = useState<{ anchor: HTMLElement; row: RatePlanRow } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RatePlanRow | null>(null);

  const isEditable = (row: RatePlanRow): boolean =>
    row.kind === 'override' && row.key !== 'base';

  const handleConfirmDelete = () => {
    if (pendingDelete && onDelete) onDelete(pendingDelete.key);
    setPendingDelete(null);
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, mb: 1.5 }}>
        {t('partner.room.rate_plan_title')}
      </Typography>

      <Stack spacing={1}>
        {rows.map((row) => (
          <Box
            key={row.key}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 1.5,
              py: 1.25,
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {row.kind === 'base'
                  ? t('partner.room.rate_plan_base_label')
                  : t('partner.room.rate_plan_override_label', formatRatePeriodRange(row.fromDate!, row.toDate!))}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {row.kind === 'base'
                  ? t('partner.room.rate_plan_base_sub')
                  : t('partner.room.rate_plan_override_sub')}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'primary.main' }}>
                {formatPrice(row.priceUsd, currency)}
              </Typography>
              {isEditable(row) && (
                <IconButton
                  size="small"
                  onClick={(e) => setMenuFor({ anchor: e.currentTarget, row })}
                  disabled={deletingRateId === row.key}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Stack spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" fullWidth size="small" startIcon={<AddIcon />} onClick={onNewRate}>
          {t('partner.room.rate_plan_new_btn')}
        </Button>
      </Stack>

      <Menu
        anchorEl={menuFor?.anchor ?? null}
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
      >
        <MenuItem
          onClick={() => {
            if (menuFor && onEdit) onEdit(menuFor.row);
            setMenuFor(null);
          }}
          sx={{ fontSize: 13 }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          {t('partner.room.rate_plan_edit_btn')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFor) setPendingDelete(menuFor.row);
            setMenuFor(null);
          }}
          sx={{ color: 'error.main', fontSize: 13 }}
        >
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
          {t('partner.room.rate_plan_delete_btn')}
        </MenuItem>
      </Menu>

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('partner.room.rate_plan_delete_dialog_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingDelete &&
              t('partner.room.rate_plan_delete_dialog_body', {
                ...formatRatePeriodRange(pendingDelete.fromDate!, pendingDelete.toDate!),
                price: formatPrice(pendingDelete.priceUsd, currency),
              })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} disabled={!!deletingRateId}>
            {t('partner.room.rate_plan_delete_cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
            loading={!!deletingRateId}
          >
            {t('partner.room.rate_plan_delete_confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
