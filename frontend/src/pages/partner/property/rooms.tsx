import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAuth } from '../../../hooks/useAuth';
import { useLocale } from '../../../context/LocaleContext';
import { fetchPartnerPropertyRooms } from '../../../utils/queries';
import { formatPrice } from '../../../utils/currency';
import PageContainer from '../../../components/PageContainer';
import { TH, TD } from '../sections/ui';

const ROOM_TYPE_OPTIONS = ['', 'deluxe', 'suite', 'standard', 'junior_suite', 'penthouse'];

export default function RoomsBody() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { currency } = useLocale();
  const navigate = useNavigate();
  const { propertyId } = useParams({ from: '/mi-hotel/$propertyId' });

  const [roomType, setRoomType] = useState('');
  const [roomMenu, setRoomMenu] = useState<{ el: HTMLElement; roomId: string } | null>(null);

  const partnerId = user?.partnerId ?? '';
  const enabled = !!token && !!partnerId;

  const roomsQuery = useQuery({
    queryKey: ['property-rooms', partnerId, propertyId],
    queryFn: () => fetchPartnerPropertyRooms(partnerId, propertyId, token!),
    enabled,
  });

  if (!enabled) {
    return (
      <PageContainer>
        <Alert severity="info">{t('partner.dashboard.login_required')}</Alert>
      </PageContainer>
    );
  }

  if (roomsQuery.isError) {
    return (
      <PageContainer>
        <Alert severity="error">{t('partner.dashboard.load_error')}</Alert>
      </PageContainer>
    );
  }

  const allRooms = roomsQuery.data?.rooms ?? [];
  const rooms = roomType ? allRooms.filter((r) => r.roomType === roomType) : allRooms;

  return (
    <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            select
            size="small"
            label={t('partner.dashboard.room_type_filter')}
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            sx={{ width: 220 }}
          >
            {ROOM_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt || 'all'} value={opt} sx={{ fontSize: 12 }}>
                {opt || t('partner.dashboard.all_room_types')}
              </MenuItem>
            ))}
          </TextField>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
            {t('partner.dashboard.rooms_title')}
          </Typography>
          <Button
            variant="text"
            sx={{ fontSize: 12, color: '#1B4F8C', p: 0, textDecoration: 'underline', textTransform: 'none' }}
          >
            {t('partner.dashboard.manage_rooms')}
          </Button>
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TH>{t('partner.dashboard.col_room_type')}</TH>
                  <TH>{t('partner.dashboard.col_capacity')}</TH>
                  <TH>{t('partner.dashboard.col_beds')}</TH>
                  <TH>{t('partner.dashboard.col_base_rate')}</TH>
                  <TH>{t('partner.dashboard.col_availability')}</TH>
                  <TH>{t('partner.dashboard.col_room_status')}</TH>
                  <TH width={40}>{''}</TH>
                </TableRow>
              </TableHead>
              <TableBody>
                {roomsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={20} />
                    </TableCell>
                  </TableRow>
                ) : rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, fontSize: 12, color: '#6b7280' }}>
                      {t('partner.dashboard.no_rooms')}
                    </TableCell>
                  </TableRow>
                ) : rooms.map((room) => {
                  const availPct = Math.round((1 - room.occupancyRate) * 100);
                  const isActive = room.status === 'active';
                  return (
                    <TableRow key={room.roomId} sx={{ '&:hover': { bgcolor: '#F9FAFB' } }}>
                      <TD sx={{ fontWeight: 500 }}>{room.roomType}</TD>
                      <TD>{t('partner.dashboard.guests_count', { count: room.capacity })}</TD>
                      <TD>{room.bedType}</TD>
                      <TD>{formatPrice(room.basePriceUsd, currency)}</TD>
                      <TD>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LinearProgress
                            variant="determinate"
                            value={availPct}
                            sx={{ width: 80, height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' } }}
                          />
                          <Typography sx={{ fontSize: 11, color: '#4a5568', minWidth: 28 }}>{availPct}%</Typography>
                        </Stack>
                      </TD>
                      <TD>
                        <Chip
                          label={isActive ? t('partner.dashboard.room_active') : t('partner.dashboard.room_no_stock')}
                          size="small"
                          sx={{
                            fontSize: 11,
                            height: 22,
                            bgcolor: isActive ? '#dcfce7' : '#fef3c7',
                            color: isActive ? '#166534' : '#92400e',
                            fontWeight: 500,
                          }}
                        />
                      </TD>
                      <TD align="right">
                        <IconButton
                          size="small"
                          sx={{ color: '#6b7280' }}
                          onClick={(e) => setRoomMenu({ el: e.currentTarget, roomId: room.roomId })}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TD>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Menu
          anchorEl={roomMenu?.el}
          open={Boolean(roomMenu)}
          onClose={() => setRoomMenu(null)}
        >
          <MenuItem
            sx={{ fontSize: 13 }}
            onClick={() => {
              if (roomMenu) {
                navigate({ to: '/mi-hotel/$propertyId/habitaciones/$roomId', params: { propertyId, roomId: roomMenu.roomId } });
                setRoomMenu(null);
              }
            }}
          >
            {t('partner.dashboard.menu_view_availability')}
          </MenuItem>
        </Menu>
    </PageContainer>
  );
}
