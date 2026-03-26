import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface RegisterPageProps {
  onSuccess: () => void;
  onNavigateLogin: () => void;
}

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

const PASSWORD_REGEX = {
  hasLetter: /[a-zA-Z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[^a-zA-Z0-9]/,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M2 2l16 16M8.5 8.6A2.5 2.5 0 0012.4 12.4M6.7 6.8C4.4 8 2.8 9.8 2 10c1.7 3.3 4.9 6 8 6a8.2 8.2 0 004.2-1.2M10 4c3.3 0 6.3 2.7 8 6a12.5 12.5 0 01-1.8 2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function validateForm(values: FormValues, t: (key: string) => string): FormErrors {
  const errors: FormErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = t('register.error_first_name_required');
  }

  if (!values.lastName.trim()) {
    errors.lastName = t('register.error_last_name_required');
  }

  if (!values.email.trim()) {
    errors.email = t('register.error_email_required');
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = t('register.error_email_invalid');
  }

  if (!values.password) {
    errors.password = t('register.error_password_required');
  } else if (values.password.length < 8) {
    errors.password = t('register.error_password_min');
  } else if (values.password.length > 16) {
    errors.password = t('register.error_password_max');
  } else if (
    !PASSWORD_REGEX.hasLetter.test(values.password) ||
    !PASSWORD_REGEX.hasNumber.test(values.password) ||
    !PASSWORD_REGEX.hasSpecial.test(values.password)
  ) {
    errors.password = t('register.error_password_complexity');
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = t('register.error_confirm_password_required');
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = t('register.error_passwords_mismatch');
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = t('register.error_terms_required');
  }

  return errors;
}

export default function RegisterPage({ onSuccess, onNavigateLogin }: RegisterPageProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [values, setValues] = useState<FormValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof FormValues, value: string | boolean) => {
    const updated = { ...values, [field]: value };
    setValues(updated);
    if (submitted) {
      setErrors(validateForm(updated, t));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const validationErrors = validateForm(values, t);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      onSuccess();
    }
  };

  const inputClass = (error?: string) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#4a6fa5] transition ${
      error ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
      <Navbar onNavigateRegister={() => undefined} />

      <main className="flex-1 flex items-center justify-center py-10 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('register.title')}</h1>
          <p className="text-sm text-gray-600 mb-6">
            {t('register.subtitle')}{' '}
            <button
              type="button"
              onClick={onNavigateLogin}
              className="text-[#4a6fa5] hover:underline font-medium"
            >
              {t('register.login_link')}
            </button>
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Name row */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {t('register.first_name_label')}
                </label>
                <input
                  type="text"
                  placeholder={t('register.first_name_placeholder')}
                  value={values.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  aria-label={t('register.first_name_label')}
                  aria-describedby={errors.firstName ? 'error-first-name' : undefined}
                  aria-invalid={!!errors.firstName}
                  className={inputClass(errors.firstName)}
                />
                {errors.firstName && (
                  <p id="error-first-name" className="mt-1 text-xs text-red-500">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {t('register.last_name_label')}
                </label>
                <input
                  type="text"
                  placeholder={t('register.last_name_placeholder')}
                  value={values.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  aria-label={t('register.last_name_label')}
                  aria-describedby={errors.lastName ? 'error-last-name' : undefined}
                  aria-invalid={!!errors.lastName}
                  className={inputClass(errors.lastName)}
                />
                {errors.lastName && (
                  <p id="error-last-name" className="mt-1 text-xs text-red-500">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('register.email_label')}
              </label>
              <input
                type="email"
                placeholder={t('register.email_placeholder')}
                value={values.email}
                onChange={(e) => handleChange('email', e.target.value)}
                aria-label={t('register.email_label')}
                aria-describedby={errors.email ? 'error-email' : undefined}
                aria-invalid={!!errors.email}
                className={inputClass(errors.email)}
              />
              {errors.email && (
                <p id="error-email" className="mt-1 text-xs text-red-500">
                  {errors.email}
                </p>
              )}
            </div>

            <hr className="border-gray-100 my-5" />

            {/* Password */}
            <div className="mb-4">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('register.password_label')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  aria-label={t('register.password_label')}
                  aria-describedby={errors.password ? 'error-password' : undefined}
                  aria-invalid={!!errors.password}
                  className={`${inputClass(errors.password)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('register.hide_password') : t('register.show_password')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <p id="error-password" className="mt-1 text-xs text-red-500">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="mb-5">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('register.confirm_password_label')}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={values.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  aria-label={t('register.confirm_password_label')}
                  aria-describedby={errors.confirmPassword ? 'error-confirm-password' : undefined}
                  aria-invalid={!!errors.confirmPassword}
                  className={`${inputClass(errors.confirmPassword)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? t('register.hide_confirm_password') : t('register.show_confirm_password')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="error-confirm-password" className="mt-1 text-xs text-red-500">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Terms */}
            <div className="mb-6">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values.acceptTerms}
                  onChange={(e) => handleChange('acceptTerms', e.target.checked)}
                  aria-label={t('register.accept_terms_label')}
                  aria-describedby={errors.acceptTerms ? 'error-terms' : undefined}
                  className="mt-0.5 accent-[#4a6fa5]"
                />
                <span className="text-sm text-gray-600">
                  {t('register.terms_text')}{' '}
                  <a href="#" className="text-[#4a6fa5] hover:underline">
                    {t('register.terms_link')}
                  </a>{' '}
                  {t('register.terms_and')}{' '}
                  <a href="#" className="text-[#4a6fa5] hover:underline">
                    {t('register.privacy_link')}
                  </a>{' '}
                  {t('register.terms_suffix')}
                </span>
              </label>
              {errors.acceptTerms && (
                <p id="error-terms" className="mt-1 text-xs text-red-500">
                  {errors.acceptTerms}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-auto bg-[#2d3e6b] hover:bg-[#1f2d50] text-white font-semibold text-sm px-8 py-3 rounded-lg transition-colors"
            >
              {t('register.submit')}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
