import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

export interface GuestCounts {
  adults: number;
  children: number;
}

interface CounterRowProps {
  label: string;
  value: number;
  min: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

function CounterRow({ label, value, min, onDecrement, onIncrement }: CounterRowProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
      <Typography fontWeight={600} fontSize="1rem">{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <IconButton aria-label={`decrease ${label}`} size="small" onClick={onDecrement} disabled={value <= min} sx={{ color: 'primary.main' }}>
          <RemoveIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ minWidth: 36, textAlign: 'center', fontWeight: 500 }}>{value}</Typography>
        <IconButton aria-label={`increase ${label}`} size="small" onClick={onIncrement} sx={{ color: 'primary.main' }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

interface GuestSelectorProps {
  adults: number;
  children: number;
  onChange: (counts: GuestCounts) => void;
}

export default function GuestSelector({ adults, children, onChange }: GuestSelectorProps) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const total = adults + children;
  const summary = t('hero.guests_summary', { count: total });

  return (
    <>
      <Button
        variant="text"
        startIcon={<PersonOutlineIcon sx={{ color: 'text.secondary' }} />}
        endIcon={<KeyboardArrowDownIcon sx={{ color: 'text.secondary', ml: 'auto' }} />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        fullWidth
        sx={{
          color: 'text.primary',
          fontWeight: 400,
          fontSize: '0.875rem',
          justifyContent: 'flex-start',
          '& .MuiButton-endIcon': { marginLeft: 'auto' },
        }}
      >
        {summary}
      </Button>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 3, minWidth: 320, borderRadius: 2, mt: 1 } } }}
      >
        <CounterRow
          label={t('hero.guests_adults')}
          value={adults}
          min={1}
          onDecrement={() => onChange({ adults: adults - 1, children })}
          onIncrement={() => onChange({ adults: adults + 1, children })}
        />
        <CounterRow
          label={t('hero.guests_children')}
          value={children}
          min={0}
          onDecrement={() => onChange({ adults, children: children - 1 })}
          onIncrement={() => onChange({ adults, children: children + 1 })}
        />

        <Divider sx={{ my: 2 }} />

        <Button fullWidth variant="outlined" onClick={() => setAnchorEl(null)}>
          {t('hero.guests_done')}
        </Button>
      </Popover>
    </>
  );
}
