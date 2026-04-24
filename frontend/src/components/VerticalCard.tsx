import type { SxProps, Theme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';

const DEFAULT_FALLBACK = 'https://placehold.co/400x176?text=Hotel';

interface VerticalCardProps {
  imageUrl?: string;
  imageAlt?: string;
  imageFallbackUrl?: string;
  imageHeight?: number;
  content: React.ReactNode;
  footer?: React.ReactNode;
  sx?: SxProps<Theme>;
  onClick?: () => void;
}

export default function VerticalCard({
  imageUrl,
  imageAlt = '',
  imageFallbackUrl = DEFAULT_FALLBACK,
  imageHeight = 176,
  content,
  footer,
  sx,
  onClick,
}: VerticalCardProps) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{ display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden', ...sx }}
    >
      {imageUrl && (
        <CardMedia
          component="img"
          image={imageUrl}
          alt={imageAlt}
          sx={{ width: '100%', height: imageHeight, objectFit: 'cover', flexShrink: 0 }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = imageFallbackUrl;
          }}
        />
      )}
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {content}
      </CardContent>
      {footer && (
        <Box sx={{ px: 2, pb: 2 }}>
          {footer}
        </Box>
      )}
    </Card>
  );
}
