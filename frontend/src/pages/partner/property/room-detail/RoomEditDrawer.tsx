import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useTranslation } from 'react-i18next';
import dayjs from '../../../../utils/dayjs';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmtLabel(date: string): string {
  const d = dayjs.utc(date);
  return `${d.date()} ${MONTHS_ES[d.month()]}`;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(dayjs.utc(b).diff(dayjs.utc(a), 'day')) + 1;
}

export type DrawerMode = 'rate-create' | 'rate-edit' | 'block-create';

interface RoomEditDrawerProps {
  mode: DrawerMode;
  selStart: string | null;
  selEnd: string | null;
  initialPrice?: number;
  saving: boolean;
  onClose: () => void;
  onApply: (params: { price: number | null }) => void;
}

const TITLE_KEY: Record<DrawerMode, string> = {
  'rate-create': 'partner.room.drawer_title_rate_create',
  'rate-edit': 'partner.room.drawer_title_rate_edit',
  'block-create': 'partner.room.drawer_title_block_create',
};

const APPLY_KEY: Record<DrawerMode, string> = {
  'rate-create': 'partner.room.drawer_apply_create',
  'rate-edit': 'partner.room.drawer_apply_edit',
  'block-create': 'partner.room.drawer_apply_block',
};

export default function RoomEditDrawer({
  mode,
  selStart,
  selEnd,
  initialPrice,
  saving,
  onClose,
  onApply,
}: RoomEditDrawerProps) {
  const { t } = useTranslation();
  const [price, setPrice] = useState<string>(initialPrice != null ? String(initialPrice) : '');

  if (!selStart || !selEnd) return null;

  const lo = selStart < selEnd ? selStart : selEnd;
  const hi = selStart < selEnd ? selEnd : selStart;
  const isSingle = lo === hi;
  const days = daysBetween(lo, hi);

  const showsPriceField = mode === 'rate-create' || mode === 'rate-edit';
  const priceNum = price.trim() !== '' ? parseFloat(price) : NaN;
  const priceValid = Number.isFinite(priceNum) && priceNum > 0;
  const canApply = mode === 'block-create' ? true : priceValid;

  function handleApply() {
    if (!canApply) return;
    onApply({ price: showsPriceField ? priceNum : null });
  }

  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '3px' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
          {t(TITLE_KEY[mode])}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: '14px' }}>
        {isSingle ? fmtLabel(lo) : `${fmtLabel(lo)} → ${fmtLabel(hi)}`}
      </Typography>

      <Chip
        icon={<CalendarTodayIcon sx={{ fontSize: '13px !important' }} />}
        label={days === 1 ? t('partner.room.drawer_1_day') : t('partner.room.drawer_n_days', { count: days })}
        size="small"
        sx={{ alignSelf: 'flex-start', bgcolor: 'info.light', color: 'info.dark', fontWeight: 600, fontSize: 12, mb: '16px' }}
      />

      {showsPriceField && (
        <>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, mb: '5px' }}>
            {t('partner.room.drawer_price_label')}
          </Typography>
          <TextField
            type="number"
            size="small"
            fullWidth
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputProps={{ min: 0, step: 1 }}
            placeholder={t('partner.room.drawer_price_placeholder')}
            sx={{ mb: '4px', '& .MuiOutlinedInput-root': { fontSize: 13 } }}
          />
          <Typography sx={{ fontSize: 11, color: 'text.disabled', mb: '14px' }}>
            {t('partner.room.drawer_price_hint')}
          </Typography>
        </>
      )}

      {mode === 'block-create' && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: '14px' }}>
          {t('partner.room.drawer_block_hint')}
        </Typography>
      )}

      <Divider sx={{ my: '14px' }} />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="outlined" size="small" onClick={onClose} sx={{ flex: 1, fontSize: 13 }}>
          {t('partner.room.drawer_cancel')}
        </Button>
        <Button
          variant="contained"
          color={mode === 'block-create' ? 'error' : 'primary'}
          size="small"
          startIcon={<CheckIcon />}
          loading={saving}
          onClick={handleApply}
          disabled={!canApply}
          sx={{ flex: 1, fontSize: 13 }}
        >
          {t(APPLY_KEY[mode])}
        </Button>
      </Box>
    </Card>
  );
}
