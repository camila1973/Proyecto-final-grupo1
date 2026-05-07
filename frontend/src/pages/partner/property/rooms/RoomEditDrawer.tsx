import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useTranslation } from 'react-i18next';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmtLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime());
  return Math.round(ms / 86_400_000) + 1;
}

interface RoomEditDrawerProps {
  open: boolean;
  selStart: string | null;
  selEnd: string | null;
  totalRooms: number;
  defaultBlock?: boolean;
  saving: boolean;
  onClose: () => void;
  onApply: (params: { avail: number | null; price: number | null; block: boolean }) => void;
}

export default function RoomEditDrawer({
  open,
  selStart,
  selEnd,
  totalRooms,
  defaultBlock = false,
  saving,
  onClose,
  onApply,
}: RoomEditDrawerProps) {
  const { t } = useTranslation();
  const [avail, setAvail] = useState('');
  const [price, setPrice] = useState('');
  const [block, setBlock] = useState(defaultBlock);

  if (!open || !selStart || !selEnd) return null;

  const lo = selStart < selEnd ? selStart : selEnd;
  const hi = selStart < selEnd ? selEnd : selStart;
  const isSingle = lo === hi;
  const days = daysBetween(lo, hi);

  function handleApply() {
    const availNum = avail.trim() !== '' ? parseInt(avail, 10) : null;
    const priceNum = price.trim() !== '' ? parseFloat(price) : null;
    onApply({ avail: availNum, price: priceNum, block });
  }

  return (
    <Box
      sx={{
        width: 272,
        flexShrink: 0,
        borderLeft: '0.5px solid #e2e8f0',
        bgcolor: '#fff',
        p: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Title row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '3px' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
          {isSingle ? t('partner.room.drawer_title_day') : t('partner.room.drawer_title_range')}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#6b7280' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Typography sx={{ fontSize: 12, color: '#6b7280', mb: '14px' }}>
        {isSingle ? fmtLabel(lo) : `${fmtLabel(lo)} → ${fmtLabel(hi)}`}
      </Typography>

      <Chip
        icon={<CalendarTodayIcon sx={{ fontSize: '13px !important' }} />}
        label={days === 1 ? t('partner.room.drawer_1_day') : t('partner.room.drawer_n_days', { count: days })}
        size="small"
        sx={{ alignSelf: 'flex-start', bgcolor: '#E6F1FB', color: '#0C447C', fontWeight: 500, fontSize: 12, mb: '16px' }}
      />

      {/* Available rooms */}
      <Typography sx={{ fontSize: 11, fontWeight: 500, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 0.4, mb: '5px' }}>
        {t('partner.room.drawer_avail_label')}
      </Typography>
      <TextField
        type="number"
        size="small"
        value={avail}
        onChange={(e) => setAvail(e.target.value)}
        inputProps={{ min: 0, max: totalRooms }}
        placeholder={t('partner.room.drawer_avail_placeholder')}
        sx={{ mb: '4px', '& .MuiOutlinedInput-root': { fontSize: 13 } }}
      />
      <Typography sx={{ fontSize: 11, color: '#9ca3af', mb: '14px' }}>
        {t('partner.room.drawer_avail_hint', { max: totalRooms })}
      </Typography>

      {/* Price per night */}
      <Typography sx={{ fontSize: 11, fontWeight: 500, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 0.4, mb: '5px' }}>
        {t('partner.room.drawer_price_label')}
      </Typography>
      <TextField
        type="number"
        size="small"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        inputProps={{ min: 0, step: 1 }}
        placeholder={t('partner.room.drawer_price_placeholder')}
        sx={{ mb: '4px', '& .MuiOutlinedInput-root': { fontSize: 13 } }}
      />
      <Typography sx={{ fontSize: 11, color: '#9ca3af', mb: '14px' }}>
        {t('partner.room.drawer_price_hint')}
      </Typography>

      {/* Block toggle */}
      <Box sx={{ mb: '4px' }}>
        <FormControlLabel
          control={
            <Switch
              checked={block}
              onChange={(e) => setBlock(e.target.checked)}
              size="small"
              sx={{ '& .MuiSwitch-thumb': { bgcolor: block ? '#1e3a5f' : undefined } }}
            />
          }
          label={<Typography sx={{ fontSize: 13 }}>{t('partner.room.drawer_block_label')}</Typography>}
          sx={{ m: 0 }}
        />
      </Box>
      <Typography sx={{ fontSize: 11, color: '#9ca3af', mb: 0 }}>
        {t('partner.room.drawer_block_hint')}
      </Typography>

      <Divider sx={{ my: '14px', borderColor: '#e2e8f0' }} />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onClose}
          sx={{ flex: 1, fontSize: 13, borderColor: '#d1d5db', color: '#374151' }}
        >
          {t('partner.room.drawer_cancel')}
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<CheckIcon />}
          onClick={handleApply}
          disabled={saving}
          sx={{ flex: 1, fontSize: 13, bgcolor: '#1B4F8C', '&:hover': { bgcolor: '#163d6e' } }}
        >
          {t('partner.room.drawer_apply')}
        </Button>
      </Box>
    </Box>
  );
}
