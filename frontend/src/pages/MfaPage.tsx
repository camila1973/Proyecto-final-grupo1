import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { API_BASE } from '../env';
import { useAuth } from '../hooks/useAuth';

type MfaSearch = { challengeId: string | undefined };
type MfaErrorKey = 'expired' | 'too_many_attempts' | 'invalid_code' | 'generic';

export default function MfaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { challengeId } = useSearch({ strict: false }) as MfaSearch;
  const { login } = useAuth();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [errorKey, setErrorKey] = useState<MfaErrorKey | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!challengeId) navigate({ to: '/login' });
  }, [challengeId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorKey(null);

    if (!code.trim() || !/^\d{6}$/.test(code.trim())) {
      setCodeError(t('mfa.errors.code_invalid'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login/mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, code: code.trim() }),
      });

      if (response.status === 401) {
        const data = await response.json() as { message?: string };
        const msg = data.message ?? '';
        if (msg.includes('expired')) {
          setErrorKey('expired');
        } else if (msg.includes('attempts')) {
          setErrorKey('too_many_attempts');
        } else {
          setErrorKey('invalid_code');
        }
        return;
      }

      if (!response.ok) {
        setErrorKey('generic');
        return;
      }

      const data = await response.json() as {
        accessToken: string;
        user: { id: string; email: string; role: string };
      };

      login(data.accessToken, data.user);
      navigate({ to: '/' });
    } catch {
      setErrorKey('generic');
    } finally {
      setLoading(false);
    }
  };

  const showRetryLink = errorKey === 'expired' || errorKey === 'too_many_attempts';

  return (
    <main className="flex-1 flex items-center justify-center py-10 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('mfa.title')}</h1>
        <p className="text-sm text-gray-600 mb-6">{t('mfa.description')}</p>

        {errorKey && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t(`mfa.errors.${errorKey}`)}
            {showRetryLink && (
              <span>
                {' '}
                <a href="#/login" className="underline">
                  {t('mfa.try_again_link')}
                </a>
              </span>
            )}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {t('mfa.code_label')}
            </label>
            <TextField
              fullWidth
              size="small"
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
                if (codeError) setCodeError(undefined);
              }}
              error={!!codeError}
              helperText={codeError}
              inputProps={{
                'aria-label': t('mfa.code_label'),
                inputMode: 'numeric',
                maxLength: 6,
                style: { letterSpacing: '0.3em', fontSize: '1.25rem', textAlign: 'center' },
              }}
            />
          </div>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: '#2d3a8c',
              '&:hover': { bgcolor: '#1e2a6e' },
              textTransform: 'none',
              fontWeight: 600,
              py: 1.2,
              fontSize: '0.95rem',
            }}
          >
            {loading ? '...' : t('mfa.submit')}
          </Button>
        </form>
      </div>
    </main>
  );
}
