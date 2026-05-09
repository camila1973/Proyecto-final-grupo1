import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface MediaTabProps {
  thumbnailUrl: string;
}

export default function MediaTab({ thumbnailUrl }: MediaTabProps) {
  const { t } = useTranslation();
  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1a2332' }}>{t('partner.properties.edit.media.title')}</Typography>
        <Tooltip title={t('partner.properties.edit.coming_soon')}>
          <span>
            <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />} disabled>
              {t('partner.properties.edit.media.upload')}
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        {Array.from({ length: 8 }).map((_, i) => {
          const isCover = i === 0 && !!thumbnailUrl;
          const isFallback = i === 0 && !thumbnailUrl;
          return (
            <Box
              key={i}
              sx={{
                aspectRatio: '4 / 3',
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                position: 'relative',
                overflow: 'hidden',
                background:
                  i === 0 && thumbnailUrl
                    ? `center/cover no-repeat url(${thumbnailUrl})`
                    : 'repeating-linear-gradient(45deg, #f7f9fc, #f7f9fc 6px, #e3e7ee 6px, #e3e7ee 7px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!isCover && (
                <Typography
                  sx={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: '#5a6a7e',
                    bgcolor: '#fff',
                    border: '1px solid #e2e8f0',
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.5,
                  }}
                >
                  foto-{String(i + 1).padStart(2, '0')}.jpg
                </Typography>
              )}
              {isCover && (
                <Chip
                  size="small"
                  label={t('partner.properties.edit.media.cover')}
                  sx={{ position: 'absolute', top: 8, left: 8, bgcolor: '#1B4F8C', color: '#fff', fontWeight: 600, fontSize: 10.5 }}
                />
              )}
              {isFallback && (
                <Chip
                  size="small"
                  label={t('partner.properties.edit.media.no_cover')}
                  sx={{ position: 'absolute', top: 8, left: 8, bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, fontSize: 10.5 }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}
