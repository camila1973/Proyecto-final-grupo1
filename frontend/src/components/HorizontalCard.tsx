import type { SxProps, Theme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';

const DEFAULT_FALLBACK = 'https://placehold.co/224x170?text=Hotel';

interface HorizontalCardProps {
  imageUrl: string;
  imageAlt: string;
  imageFallbackUrl?: string;
  imageWidth?: number;
  contentPadding?: number;
  bgcolor?: string;
  middleContent: React.ReactNode;
  rightPanel: React.ReactNode;
  sx?: SxProps<Theme>;
}

export default function HorizontalCard({
  imageUrl,
  imageAlt,
  imageFallbackUrl = DEFAULT_FALLBACK,
  imageWidth = 220,
  contentPadding = 2.5,
  bgcolor = 'background.paper',
  middleContent,
  rightPanel,
  sx,
}: HorizontalCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{ display: 'flex', borderRadius: 3, overflow: 'hidden', bgcolor, ...sx }}
    >
      <CardMedia
        component="img"
        image={imageUrl}
        alt={imageAlt}
        sx={{ width: imageWidth, flexShrink: 0, objectFit: 'cover', alignSelf: 'stretch' }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = imageFallbackUrl;
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
          py: contentPadding,
          px: contentPadding,
          '&:last-child': { pb: contentPadding },
        }}
      >
        {middleContent}
      </CardContent>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          px: contentPadding,
          py: contentPadding,
          flexShrink: 0,
        }}
      >
        {rightPanel}
      </Box>
    </Card>
  );
}
