import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import { API_BASE } from '../env';

interface FormFields {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

function validatePassword(password: string, t: (key: string) => string): string | undefined {
  if (!password) return t('register.errors.password_required');
  if (password.length < 8) return t('register.errors.password_min');
  if (password.length > 16) return t('register.errors.password_max');
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (!hasLetter || !hasDigit || !hasSpecial) return t('register.errors.password_complexity');
  return undefined;
}

function validateForm(fields: FormFields, t: (key: string) => string): FormErrors {
  const errors: FormErrors = {};

  if (!fields.firstName.trim()) errors.firstName = t('register.errors.name_required');
  if (!fields.lastName.trim()) errors.lastName = t('register.errors.last_name_required');

  if (!fields.email.trim()) {
    errors.email = t('register.errors.email_required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = t('register.errors.email_invalid');
  }

  const passwordError = validatePassword(fields.password, t);
  if (passwordError) errors.password = passwordError;

  if (!fields.confirmPassword) {
    errors.confirmPassword = t('register.errors.confirm_required');
  } else if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = t('register.errors.confirm_mismatch');
  }

  if (!fields.terms) errors.terms = t('register.errors.terms_required');

  return errors;
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [fields, setFields] = useState<FormFields>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof FormFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'terms' ? e.target.checked : e.target.value;
    setFields((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const validationErrors = validateForm(fields, t);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.email.trim().toLowerCase(),
          password: fields.password,
        }),
      });

      if (response.status === 409) {
        setApiError(t('register.errors.email_taken'));
        return;
      }

      if (!response.ok) {
        setApiError(t('register.errors.generic'));
        return;
      }

      navigate({ to: '/register-success' });
    } catch {
      setApiError(t('register.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ visible }: { visible: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {visible ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );

  return (
    <main className="flex-1 flex items-center justify-center py-10 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('register.title')}</h1>
        <p className="text-sm text-gray-600 mb-6">
          {t('register.already_have_account')}{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            {t('register.login_link')}
          </a>
        </p>

        {apiError && (
          <Alert severity="error" className="mb-4" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                {t('register.name_label')}
              </label>
              <TextField
                fullWidth
                size="small"
                value={fields.firstName}
                onChange={handleChange('firstName')}
                error={!!errors.firstName}
                helperText={errors.firstName}
                inputProps={{ 'aria-label': t('register.name_label') }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                {t('register.last_name_label')}
              </label>
              <TextField
                fullWidth
                size="small"
                value={fields.lastName}
                onChange={handleChange('lastName')}
                error={!!errors.lastName}
                helperText={errors.lastName}
                inputProps={{ 'aria-label': t('register.last_name_label') }}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {t('register.email_label')}
            </label>
            <TextField
              fullWidth
              size="small"
              type="email"
              placeholder="micorreo@example.com"
              value={fields.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              helperText={errors.email}
              inputProps={{ 'aria-label': t('register.email_label') }}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {t('register.password_label')}
            </label>
            <TextField
              fullWidth
              size="small"
              type={showPassword ? 'text' : 'password'}
              value={fields.password}
              onChange={handleChange('password')}
              error={!!errors.password}
              helperText={errors.password}
              inputProps={{ 'aria-label': t('register.password_label') }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      size="small"
                    >
                      <EyeIcon visible={showPassword} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {t('register.confirm_password_label')}
            </label>
            <TextField
              fullWidth
              size="small"
              type={showConfirm ? 'text' : 'password'}
              value={fields.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              inputProps={{ 'aria-label': t('register.confirm_password_label') }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirm((v) => !v)}
                      edge="end"
                      size="small"
                    >
                      <EyeIcon visible={showConfirm} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </div>

          <div className="mb-6">
            <FormControlLabel
              control={
                <Checkbox
                  checked={fields.terms}
                  onChange={handleChange('terms')}
                  size="small"
                  inputProps={{ 'aria-label': 'accept terms' } as React.InputHTMLAttributes<HTMLInputElement>}
                />
              }
              label={
                <span className="text-sm text-gray-700">
                  {t('register.terms')}{' '}
                  <a href="/terms" className="text-blue-600 hover:underline">
                    {t('register.terms_link')}
                  </a>{' '}
                  {t('register.terms_and')}{' '}
                  <a href="/privacy" className="text-blue-600 hover:underline">
                    {t('register.privacy_link')}
                  </a>{' '}
                  {t('register.terms_suffix')}
                </span>
              }
            />
            {errors.terms && (
              <p className="text-xs text-red-600 mt-1 ml-8">{errors.terms}</p>
            )}
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
            {loading ? '...' : t('register.submit')}
          </Button>
        </form>
      </div>
    </main>
  );
}
