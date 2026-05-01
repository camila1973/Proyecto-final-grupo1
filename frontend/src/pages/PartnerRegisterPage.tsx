import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import { registerPartner } from '../utils/queries';
import LabeledField from '../components/LabeledField';

interface FormFields {
  orgName: string;
  slug: string;
  firstName: string;
  lastName: string;
  ownerEmail: string;
  ownerPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  orgName?: string;
  slug?: string;
  firstName?: string;
  lastName?: string;
  ownerEmail?: string;
  ownerPassword?: string;
  confirmPassword?: string;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function validatePassword(password: string, t: (key: string) => string): string | undefined {
  if (!password) return t('partner_register.errors.password_required');
  if (password.length < 8) return t('partner_register.errors.password_min');
  if (password.length > 16) return t('partner_register.errors.password_max');
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (!hasLetter || !hasDigit || !hasSpecial) return t('partner_register.errors.password_complexity');
  return undefined;
}

function validateForm(fields: FormFields, t: (key: string) => string): FormErrors {
  const errors: FormErrors = {};

  if (!fields.orgName.trim()) errors.orgName = t('partner_register.errors.org_name_required');

  if (!fields.slug.trim()) {
    errors.slug = t('partner_register.errors.slug_required');
  } else if (!/^[a-z0-9-]+$/.test(fields.slug)) {
    errors.slug = t('partner_register.errors.slug_invalid');
  }

  if (!fields.firstName.trim()) errors.firstName = t('partner_register.errors.first_name_required');
  if (!fields.lastName.trim()) errors.lastName = t('partner_register.errors.last_name_required');

  if (!fields.ownerEmail.trim()) {
    errors.ownerEmail = t('partner_register.errors.email_required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.ownerEmail.trim())) {
    errors.ownerEmail = t('partner_register.errors.email_invalid');
  }

  const pwError = validatePassword(fields.ownerPassword, t);
  if (pwError) errors.ownerPassword = pwError;

  if (!fields.confirmPassword) {
    errors.confirmPassword = t('partner_register.errors.confirm_required');
  } else if (fields.ownerPassword !== fields.confirmPassword) {
    errors.confirmPassword = t('partner_register.errors.confirm_mismatch');
  }

  return errors;
}

export default function PartnerRegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [fields, setFields] = useState<FormFields>({
    orgName: '',
    slug: '',
    firstName: '',
    lastName: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: registerPartner,
    onSuccess: (data) => {
      navigate({ to: '/login/mfa', search: { challengeId: data.challengeId } });
    },
    onError: (err: unknown) => {
      const e = err as { status?: number; body?: { message?: string } };
      if (e.status === 409) {
        const msg = (e.body?.message ?? '').toLowerCase();
        if (msg.includes('email')) {
          setErrors((prev) => ({ ...prev, ownerEmail: t('partner_register.errors.email_taken') }));
        } else {
          setErrors((prev) => ({ ...prev, slug: t('partner_register.errors.slug_taken') }));
        }
      } else {
        setApiError(t('partner_register.errors.generic'));
      }
    },
  });

  const handleChange = (field: keyof FormFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFields((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'orgName' && prev.slug === toSlug(prev.orgName)) {
        next.slug = toSlug(value);
      }
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const validationErrors = validateForm(fields, t);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    mutation.mutate({
      orgName: fields.orgName.trim(),
      slug: fields.slug.trim(),
      firstName: fields.firstName.trim(),
      lastName: fields.lastName.trim(),
      ownerEmail: fields.ownerEmail.trim().toLowerCase(),
      ownerPassword: fields.ownerPassword,
    });
  };

  return (
    <main className="flex-1 flex items-center justify-center py-10 px-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('partner_register.title')}</h1>
        <p className="text-sm text-gray-600 mb-6">
          {t('partner_register.subtitle')}
        </p>

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Org section */}
          <div className="flex items-center gap-2 mb-3">
            <BusinessIcon fontSize="small" className="text-blue-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('partner_register.org_section')}
            </span>
          </div>

          <LabeledField
            label={t('partner_register.org_name_label')}
            wrapperClassName="mb-4"
            placeholder="Marriott International"
            value={fields.orgName}
            onChange={handleChange('orgName')}
            error={!!errors.orgName}
            helperText={errors.orgName}
            slotProps={{ htmlInput: { 'aria-label': t('partner_register.org_name_label') } }}
          />

          <LabeledField
            label={t('partner_register.slug_label')}
            wrapperClassName="mb-6"
            placeholder="marriott-international"
            value={fields.slug}
            onChange={handleChange('slug')}
            error={!!errors.slug}
            helperText={errors.slug || t('partner_register.slug_hint')}
            slotProps={{ htmlInput: { 'aria-label': t('partner_register.slug_label') } }}
          />

          {/* Owner section */}
          <div className="flex items-center gap-2 mb-3">
            <PersonIcon fontSize="small" className="text-blue-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('partner_register.owner_section')}
            </span>
          </div>

          <div className="flex gap-4 mb-4">
            <LabeledField
              label={t('partner_register.first_name_label')}
              wrapperClassName="flex-1"
              value={fields.firstName}
              onChange={handleChange('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName}
              slotProps={{ htmlInput: { 'aria-label': t('partner_register.first_name_label') } }}
            />
            <LabeledField
              label={t('partner_register.last_name_label')}
              wrapperClassName="flex-1"
              value={fields.lastName}
              onChange={handleChange('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName}
              slotProps={{ htmlInput: { 'aria-label': t('partner_register.last_name_label') } }}
            />
          </div>

          <LabeledField
            label={t('partner_register.email_label')}
            wrapperClassName="mb-4"
            type="email"
            placeholder="owner@company.com"
            value={fields.ownerEmail}
            onChange={handleChange('ownerEmail')}
            error={!!errors.ownerEmail}
            helperText={errors.ownerEmail}
            slotProps={{ htmlInput: { 'aria-label': t('partner_register.email_label') } }}
          />

          <LabeledField
            label={t('partner_register.password_label')}
            wrapperClassName="mb-4"
            type={showPassword ? 'text' : 'password'}
            value={fields.ownerPassword}
            onChange={handleChange('ownerPassword')}
            error={!!errors.ownerPassword}
            helperText={errors.ownerPassword}
            slotProps={{
              htmlInput: { 'aria-label': t('partner_register.password_label') },
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
            label={t('partner_register.confirm_password_label')}
            wrapperClassName="mb-6"
            type={showConfirm ? 'text' : 'password'}
            value={fields.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            slotProps={{
              htmlInput: { 'aria-label': t('partner_register.confirm_password_label') },
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

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={mutation.isPending}
            loading={mutation.isPending}
          >
            {t('partner_register.submit')}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
          <p>
            {t('partner_register.already_have_account')}{' '}
            <Link href="#/login" underline="hover">{t('partner_register.login_link')}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
