import { useTranslation } from 'react-i18next';
import type { SearchResult, LabelMap } from './types';
import { formatCOP, resolveLabel } from './utils';
import Button from '@mui/material/Button';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface ResultCardProps {
  result: SearchResult;
  nights: number;
  amenityLabels: LabelMap;
  roomTypeLabels: LabelMap;
  onBook: () => void;
}

export default function ResultCard({
  result,
  nights,
  amenityLabels,
  roomTypeLabels,
  onBook,
}: ResultCardProps) {
  console.log(result)
  const { t } = useTranslation();
  const effectiveNights = nights > 0 ? nights : 1;
  const totalPriceUsd = (result.bestRoom.priceUsd ?? result.bestRoom.basePriceUsd) * effectiveNights;
  const nightsLabel = t('search.card.nights', { count: nights || 1 });
  const topAmenities = result.amenities.slice(0, 3);

  return (
    <Card
      variant="outlined"
      sx={{ display: 'flex', height: 170, borderRadius: 3, mb: 2, overflow: 'hidden' }}
    >
      <CardMedia
        component="img"
        image={result.thumbnailUrl || 'https://placehold.co/224x170?text=Hotel'}
        alt={result.propertyName}
        sx={{ width: '27%', flexShrink: 0, objectFit: 'cover' }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/224x170?text=Hotel';
        }}
      />

      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 0,
          overflow: 'hidden',
          py: 2,
          px: 2.5,
          '&:last-child': { pb: 2 },
        }}
      >
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            textTransform="uppercase"
            letterSpacing="0.05em"
            noWrap
            color="text.primary"
          >
            {result.propertyName}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            {result.neighborhood ? `${result.neighborhood}, ` : ''}
            {result.city}, {result.country}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            {resolveLabel(roomTypeLabels, result.bestRoom.roomType)} · {result.bestRoom.capacity}{' '}
            {t('search.card.guests', { count: result.bestRoom.capacity })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {topAmenities.map((a) => (
            <Chip
              key={a}
              label={resolveLabel(amenityLabels, a)}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem', borderRadius: 1 }}
            />
          ))}
        </Box>
      </CardContent>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          flexShrink: 0,
        }}
      >
        <Box textAlign="right">
          <Typography variant="h6" fontWeight={700} lineHeight={1.2} color="text.primary">
            {formatCOP(totalPriceUsd)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {nightsLabel}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="warning"
          onClick={onBook}
          startIcon={<BookmarkIcon fontSize="small" />}
          sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', borderRadius: 1 }}
        >
          {t('search.card.book')}
        </Button>
      </Box>
    </Card>
  );
}
