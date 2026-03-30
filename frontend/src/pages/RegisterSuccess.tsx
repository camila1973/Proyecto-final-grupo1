import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';

export default function RegisterSuccess() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <main className="flex-1 flex items-center justify-center py-10 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-md p-10 text-center">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">{t('register.success_title')}</h1>
        <p className="text-sm text-gray-600 mb-8">{t('register.success_message')}</p>

        <Button
          variant="contained"
          onClick={() => navigate({ to: '/' })}
          sx={{
            bgcolor: '#2d3a8c',
            '&:hover': { bgcolor: '#1e2a6e' },
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
            py: 1.2,
            fontSize: '0.95rem',
          }}
        >
          {t('register.success_cta')}
        </Button>
      </div>
    </main>
  );
}
