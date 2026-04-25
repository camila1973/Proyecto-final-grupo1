import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { API_BASE } from '../env';
import LabeledField from '../components/LabeledField';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = t('login.errors.email_required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = t('login.errors.email_invalid');
    if (!password) e.password = t('login.errors.password_required');
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      if (response.status === 401) {
        setApiError(t('login.errors.invalid_credentials'));
        return;
      }

      if (!response.ok) {
        setApiError(t('login.errors.generic'));
        return;
      }

      const data = await response.json() as { challengeId: string };
      navigate({ to: '/login/mfa', search: { challengeId: data.challengeId } });
    } catch {
      setApiError(t('login.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center py-10 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('login.title')}</h1>
        <p className="text-sm text-gray-600 mb-6">
          {t('login.no_account')}{' '}
          <Link href="/register" underline="hover">
            {t('login.register_link')}
          </Link>
        </p>

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <LabeledField
            label={t('login.email_label')}
            wrapperClassName="mb-4"
            type="email"
            placeholder="micorreo@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={!!errors.email}
            helperText={errors.email}
            slotProps={{ htmlInput: { 'aria-label': t('login.email_label') } }}
          />

          <LabeledField
            label={t('login.password_label')}
            wrapperClassName="mb-6"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={!!errors.password}
            helperText={errors.password}
            slotProps={{
              htmlInput: { 'aria-label': t('login.password_label') },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            size="large"
            variant="contained"
            disabled={loading}
            loading={loading}
          >
            {t('login.submit')}
          </Button>
        </form>
      </div>
    </main>
  );
}
