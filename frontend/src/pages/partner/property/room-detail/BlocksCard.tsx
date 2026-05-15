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
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTranslation } from 'react-i18next';
import type { BlockedRange } from './blockRanges';

interface BlocksCardProps {
  ranges: BlockedRange[];
  onNewBlock: () => void;
  onDelete: (range: BlockedRange) => void;
  deletingRange: BlockedRange | null;
}

function rangeKey(r: BlockedRange) {
  return `${r.from}_${r.to}`;
}

export default function BlocksCard({ ranges, onNewBlock, onDelete, deletingRange }: BlocksCardProps) {
  const { t } = useTranslation();
  const [menuFor, setMenuFor] = useState<{ anchor: HTMLElement; range: BlockedRange } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BlockedRange | null>(null);

  const handleConfirmDelete = () => {
    if (pendingDelete) onDelete(pendingDelete);
    setPendingDelete(null);
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, mb: 1.5 }}>
        {t('partner.room.blocks_title')}
      </Typography>

      {ranges.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
          {t('partner.room.blocks_empty')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {ranges.map((range) => (
            <Box
              key={rangeKey(range)}
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
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {range.from === range.to ? range.from : `${range.from} → ${range.to}`}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => setMenuFor({ anchor: e.currentTarget, range })}
                disabled={!!deletingRange && rangeKey(deletingRange) === rangeKey(range)}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}

      <Stack spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" color="error" fullWidth size="small" startIcon={<AddIcon />} onClick={onNewBlock}>
          {t('partner.room.blocks_new_btn')}
        </Button>
      </Stack>

      <Menu
        anchorEl={menuFor?.anchor ?? null}
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
      >
        <MenuItem
          onClick={() => {
            if (menuFor) setPendingDelete(menuFor.range);
            setMenuFor(null);
          }}
          sx={{ color: 'error.main', fontSize: 13 }}
        >
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
          {t('partner.room.blocks_delete_btn')}
        </MenuItem>
      </Menu>

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('partner.room.blocks_delete_dialog_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingDelete &&
              t('partner.room.blocks_delete_dialog_body', {
                from: pendingDelete.from,
                to: pendingDelete.to,
              })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} disabled={!!deletingRange}>
            {t('partner.room.blocks_delete_cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
            loading={!!deletingRange}
          >
            {t('partner.room.blocks_delete_confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
