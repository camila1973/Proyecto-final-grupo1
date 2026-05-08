import { Box, Button, Divider, Typography } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import type { RoomDetail } from '../../../../utils/queries';
import { formatPrice } from '../../../../utils/currency';
import type { Currency } from '../../../../context/LocaleContext';
import { StatusPill } from '../../dashboard/ui';

interface StripItemProps {
  label: string;
  children: React.ReactNode;
}

function StripItem({ label, children }: StripItemProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <Typography sx={{ fontSize: 10, fontWeight: 500, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{children}</Box>
    </Box>
  );
}

interface RoomSummaryStripProps {
  room: RoomDetail;
  currency: Currency;
  onBlockRange: () => void;
  onAddRate: () => void;
}

export default function RoomSummaryStrip({ room, currency, onBlockRange, onAddRate }: RoomSummaryStripProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{
      bgcolor: '#fff',
      borderBottom: '0.5px solid #e2e8f0',
      px: '2rem',
      py: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '2rem',
    }}>
      <StripItem label={t('partner.room.strip_total_rooms')}>
        {room.totalRooms}
      </StripItem>
      <Divider orientation="vertical" flexItem sx={{ borderColor: '#e2e8f0' }} />
      <StripItem label={t('partner.room.strip_base_rate')}>
        {formatPrice(room.basePriceUsd, currency)}
      </StripItem>
      <Divider orientation="vertical" flexItem sx={{ borderColor: '#e2e8f0' }} />
      <StripItem label={t('partner.room.strip_capacity')}>
        {t('partner.room.guests_count', { count: room.capacity })}
      </StripItem>
      <Divider orientation="vertical" flexItem sx={{ borderColor: '#e2e8f0' }} />
      <StripItem label={t('partner.room.strip_bed_type')}>
        {room.bedType || '—'}
      </StripItem>
      <Divider orientation="vertical" flexItem sx={{ borderColor: '#e2e8f0' }} />
      <StripItem label={t('partner.room.strip_status')}>
        <StatusPill active={room.status === 'active'} />
      </StripItem>
      <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<BlockIcon />}
          onClick={onBlockRange}
          sx={{ fontSize: 12, borderColor: '#d1d5db', color: '#374151', '&:hover': { borderColor: '#9ca3af' } }}
        >
          {t('partner.room.btn_block_range')}
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAddRate}
          sx={{ fontSize: 12, bgcolor: '#1B4F8C', '&:hover': { bgcolor: '#163d6e' } }}
        >
          {t('partner.room.btn_add_rate')}
        </Button>
      </Box>
    </Box>
  );
}
