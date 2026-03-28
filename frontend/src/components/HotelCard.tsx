import { useTranslation } from 'react-i18next';
import { useLocale } from '../context/LocaleContext';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import Typography from '@mui/material/Typography';

export interface HotelCardProps {
  id?: string;
  name: string;
  location: string;
  price: string;
  img: string;
  onClick?: () => void;
}

export default function HotelCard({ name, location, price, img, onClick }: HotelCardProps) {
  const { t } = useTranslation();
  const { currency } = useLocale();

  return (
    <Card
      onClick={onClick}
    >
      <CardMedia component="img" height={176} image={img} alt={name} />
      <CardContent>
        <Typography variant="subtitle2" fontWeight="bold" color="text.primary">{name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{location}</Typography>
        <Typography variant="h6" fontWeight="bold" color="text.primary">{currency} {price}</Typography>
        <Typography variant="caption" color="text.secondary">{t('recommendations.per_night')}</Typography>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 1 }}>
        <Button
          fullWidth
          variant="contained"
          color="warning"
          startIcon={
            <BookmarkIcon fontSize="small" />
          }
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
        >
          {t('recommendations.book')}
        </Button>
      </CardActions>
    </Card>
  );
}
