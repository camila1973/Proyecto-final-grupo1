import { render, screen, fireEvent } from '@testing-library/react';
import RegisterPage from './RegisterPage';
import { LocaleProvider } from '../context/LocaleContext';
import { setupTestI18n } from '../i18n/test-utils';
import es from '../i18n/locales/es.json';
import en from '../i18n/locales/en.json';

const i18n = setupTestI18n('es');

const onSuccess = jest.fn();
const onNavigateLogin = jest.fn();

function renderRegisterPage(lang: 'es' | 'en' = 'es') {
  i18n.changeLanguage(lang);
  return render(
    <LocaleProvider initialLanguage={lang}>
      <RegisterPage onSuccess={onSuccess} onNavigateLogin={onNavigateLogin} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  onSuccess.mockClear();
  onNavigateLogin.mockClear();
});

describe('RegisterPage', () => {
  describe('rendering', () => {
    it('renders the page title in Spanish', () => {
      renderRegisterPage('es');
      expect(screen.getByText(es.register.title)).toBeInTheDocument();
    });

    it('renders the page title in English', () => {
      renderRegisterPage('en');
      expect(screen.getByText(en.register.title)).toBeInTheDocument();
    });

    it('renders the first name field', () => {
      renderRegisterPage('es');
      expect(screen.getByRole('textbox', { name: es.register.first_name_label })).toBeInTheDocument();
    });

    it('renders the last name field', () => {
      renderRegisterPage('es');
      expect(screen.getByRole('textbox', { name: es.register.last_name_label })).toBeInTheDocument();
    });

    it('renders the email field', () => {
      renderRegisterPage('es');
      expect(screen.getByRole('textbox', { name: es.register.email_label })).toBeInTheDocument();
    });

    it('renders the submit button', () => {
      renderRegisterPage('es');
      expect(screen.getByRole('button', { name: es.register.submit })).toBeInTheDocument();
    });

    it('calls onNavigateLogin when login link is clicked', () => {
      renderRegisterPage('es');
      fireEvent.click(screen.getByText(es.register.login_link));
      expect(onNavigateLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation – required fields', () => {
    it('shows required error for first name when empty', () => {
      renderRegisterPage('es');
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(screen.getByText(es.register.error_first_name_required)).toBeInTheDocument();
    });

    it('shows required error for last name when empty', () => {
      renderRegisterPage('es');
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(screen.getByText(es.register.error_last_name_required)).toBeInTheDocument();
    });

    it('shows required error for email when empty', () => {
      renderRegisterPage('es');
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(screen.getByText(es.register.error_email_required)).toBeInTheDocument();
    });

    it('shows invalid email error for bad format', () => {
      renderRegisterPage('es');
      fireEvent.change(screen.getByRole('textbox', { name: es.register.email_label }), {
        target: { value: 'not-an-email' },
      });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(screen.getByText(es.register.error_email_invalid)).toBeInTheDocument();
    });

    it('shows required error for password when empty', () => {
      renderRegisterPage('es');
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(screen.getByText(es.register.error_password_required)).toBeInTheDocument();
    });

    it('shows terms error when not accepted', () => {
      renderRegisterPage('es');
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(screen.getByText(es.register.error_terms_required)).toBeInTheDocument();
    });
  });

  describe('validation – password rules', () => {
    it('shows min-length error when password is too short', () => {
      renderRegisterPage('es');
      fireEvent.change(screen.getByLabelText(es.register.password_label), {
        target: { value: 'Ab1!' },
      });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(screen.getByText(es.register.error_password_min)).toBeInTheDocument();
    });

    it('shows max-length error when password exceeds 16 characters', () => {
      renderRegisterPage('es');
      fireEvent.change(screen.getByLabelText(es.register.password_label), {
        target: { value: 'AbcdefghijklMN1!' },
      });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      // 16 chars is the max so let's use 17
      fireEvent.change(screen.getByLabelText(es.register.password_label), {
        target: { value: 'AbcdefghijklMN1!X' },
      });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(screen.getByText(es.register.error_password_max)).toBeInTheDocument();
    });

    it('shows complexity error when password lacks a special character', () => {
      renderRegisterPage('es');
      fireEvent.change(screen.getByLabelText(es.register.password_label), {
        target: { value: 'Password1' },
      });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(screen.getByText(es.register.error_password_complexity)).toBeInTheDocument();
    });

    it('shows complexity error when password lacks a number', () => {
      renderRegisterPage('es');
      fireEvent.change(screen.getByLabelText(es.register.password_label), {
        target: { value: 'Password!' },
      });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(screen.getByText(es.register.error_password_complexity)).toBeInTheDocument();
    });

    it('shows passwords mismatch error', () => {
      renderRegisterPage('es');
      fireEvent.change(screen.getByLabelText(es.register.password_label), {
        target: { value: 'Valid1!' },
      });
      fireEvent.change(screen.getByLabelText(es.register.confirm_password_label), {
        target: { value: 'Different1!' },
      });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(screen.getByText(es.register.error_passwords_mismatch)).toBeInTheDocument();
    });
  });

  describe('successful submission', () => {
    function fillValidForm(lang: 'es' | 'en' = 'es') {
      const t = lang === 'es' ? es : en;
      fireEvent.change(screen.getByRole('textbox', { name: t.register.first_name_label }), {
        target: { value: 'Juan' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: t.register.last_name_label }), {
        target: { value: 'Pérez' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: t.register.email_label }), {
        target: { value: 'juan@example.com' },
      });
      fireEvent.change(screen.getByLabelText(t.register.password_label), {
        target: { value: 'Secure1!' },
      });
      fireEvent.change(screen.getByLabelText(t.register.confirm_password_label), {
        target: { value: 'Secure1!' },
      });
      fireEvent.click(screen.getByRole('checkbox', { name: es.register.accept_terms_label }));
    }

    it('calls onSuccess when all fields are valid', () => {
      renderRegisterPage('es');
      fillValidForm('es');
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('does not call onSuccess when form is invalid', () => {
      renderRegisterPage('es');
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
