import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { API_BASE } from '../env';
import LabeledField from '../components/LabeledField';

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
          firstName: fields.firstName.trim() || undefined,
          lastName: fields.lastName.trim() || undefined,
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

      const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.email.trim().toLowerCase(),
          password: fields.password,
        }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json() as { challengeId: string };
        navigate({ to: '/login/mfa', search: { challengeId: loginData.challengeId } });
      } else {
        navigate({ to: '/register-success' });
      }
    } catch {
      setApiError(t('register.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center py-10 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('register.title')}</h1>
        <p className="text-sm text-gray-600 mb-6">
          {t('register.already_have_account')}{' '}
          <Link href="/login" underline="hover">
            {t('register.login_link')}
          </Link>
        </p>

        {apiError && (
          <Alert severity="error" className="mb-4" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex gap-4 mb-4">
            <LabeledField
              label={t('register.name_label')}
              wrapperClassName="flex-1"
              value={fields.firstName}
              onChange={handleChange('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName}
              slotProps={{ htmlInput: { 'aria-label': t('register.name_label') } }}
            />
            <LabeledField
              label={t('register.last_name_label')}
              wrapperClassName="flex-1"
              value={fields.lastName}
              onChange={handleChange('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName}
              slotProps={{ htmlInput: { 'aria-label': t('register.last_name_label') } }}
            />
          </div>

          <LabeledField
            label={t('register.email_label')}
            wrapperClassName="mb-4"
            type="email"
            placeholder="micorreo@example.com"
            value={fields.email}
            onChange={handleChange('email')}
            error={!!errors.email}
            helperText={errors.email}
            slotProps={{ htmlInput: { 'aria-label': t('register.email_label') } }}
          />

          <LabeledField
            label={t('register.password_label')}
            wrapperClassName="mb-4"
            type={showPassword ? 'text' : 'password'}
            value={fields.password}
            onChange={handleChange('password')}
            error={!!errors.password}
            helperText={errors.password}
            slotProps={{
              htmlInput: { 'aria-label': t('register.password_label') },
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

          <LabeledField
            label={t('register.confirm_password_label')}
            wrapperClassName="mb-5"
            type={showConfirm ? 'text' : 'password'}
            value={fields.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            slotProps={{
              htmlInput: { 'aria-label': t('register.confirm_password_label') },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirm((v) => !v)}
                      edge="end"
                      size="small"
                    >
                      {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <div className="mb-6">
            <FormControlLabel
              control={
                <Checkbox
                  checked={fields.terms}
                  onChange={handleChange('terms')}
                  size="small"
                  slotProps={{ input: { 'aria-label': 'accept terms' } as React.InputHTMLAttributes<HTMLInputElement> }}
                />
              }
              label={
                <span className="text-sm text-gray-700">
                  {t('register.terms')}{' '}
                  <Link href="/terms" underline="hover">{t('register.terms_link')}</Link>{' '}
                  {t('register.terms_and')}{' '}
                  <Link href="/privacy" underline="hover">{t('register.privacy_link')}</Link>{' '}
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
            size="large"
            disabled={loading}
            loading={loading}
          >
            {t('register.submit')}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            {t('register.partner_cta')}{' '}
            <Link href="#/register/partner" underline="hover" className="font-medium">
              {t('register.partner_link')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
