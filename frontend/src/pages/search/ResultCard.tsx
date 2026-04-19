import { useTranslation } from 'react-i18next';
import { useLocale } from '../../context/LocaleContext';
import type { SearchResult, LabelMap } from './types';
import { formatPrice, resolveLabel } from './utils';
import { formatAddress } from '../../utils/address';
import Button from '@mui/material/Button';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import HorizontalCard from '../../components/HorizontalCard';

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
  const { t } = useTranslation();
  const { currency } = useLocale();
  const { estimatedTotalUsd, hasFlatFees } = result;
  const nightsLabel = t('search.card.nights', { count: nights || 1 });
  const inclLabel = hasFlatFees
    ? t('search.card.incl_taxes_fees')
    : t('search.card.incl_taxes_only');
  const topAmenities = result.property.amenities.slice(0, 3);

  return (
    <HorizontalCard
      imageUrl={result.property.thumbnailUrl || 'https://placehold.co/224x170?text=Hotel'}
      imageAlt={result.property.name}
      imageFallbackUrl="https://placehold.co/224x170?text=Hotel"
      sx={{ mb: 2 }}
      middleContent={
        <>
          <Box>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              textTransform="uppercase"
              letterSpacing="0.05em"
              noWrap
              color="text.primary"
            >
              {result.property.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              {formatAddress(result.property.neighborhood, result.property.city, result.property.countryCode)}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              {resolveLabel(roomTypeLabels, result.roomType)} · {result.capacity}{' '}
              {t('search.card.guests', { count: result.capacity })}
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
        </>
      }
      rightPanel={
        <>
          <Box textAlign="right">
            <Typography variant="h6" fontWeight={700} lineHeight={1.2} color="text.primary">
              {formatPrice(estimatedTotalUsd, currency)}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {nightsLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {inclLabel}
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
        </>
      }
    />
  );
}
