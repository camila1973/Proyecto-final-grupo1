import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupTestI18n } from '../i18n/test-utils';
import LoginPage from './LoginPage';
import es from '../i18n/locales/es.json';

setupTestI18n('es');

const mockNavigate = jest.fn();
const mockLogin = jest.fn();
const mockStartCheckoutAfterLogin = jest.fn();
const mockHasHeldReservation = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

jest.mock('../hooks/useBookingFlow', () => ({
  startCheckoutAfterLogin: (...args: unknown[]) => mockStartCheckoutAfterLogin(...args),
}));

jest.mock('../utils/queries', () => ({
  hasHeldReservation: (...args: unknown[]) => mockHasHeldReservation(...args),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockStartCheckoutAfterLogin.mockReturnValue(false);
    mockHasHeldReservation.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders title and submit button', () => {
    render(<LoginPage />);

    expect(screen.getByText(es.login.title)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: es.login.submit })).toBeInTheDocument();
  });

  it('shows required field errors for empty form', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: es.login.submit }));

    expect(await screen.findByText(es.login.errors.email_required)).toBeInTheDocument();
    expect(screen.getByText(es.login.errors.password_required)).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText(es.login.password_label) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    fireEvent.click(screen.getByLabelText('toggle password visibility'));
    expect(passwordInput.type).toBe('text');
  });

  it('shows invalid credentials error on 401', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByRole('textbox', { name: es.login.email_label }), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(es.login.password_label), {
      target: { value: 'Pass@1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.login.submit }));

    expect(await screen.findByText(es.login.errors.invalid_credentials)).toBeInTheDocument();
  });

  const fillAndSubmit = () => {
    fireEvent.change(screen.getByRole('textbox', { name: es.login.email_label }), {
      target: { value: 'TEST@EXAMPLE.COM ' },
    });
    fireEvent.change(screen.getByLabelText(es.login.password_label), {
      target: { value: 'Pass@1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.login.submit }));
  };

  it('navigates to MFA page when mfaRequired is true', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ mfaRequired: true, challengeId: 'ch_123' }),
    });

    render(<LoginPage />);
    fillAndSubmit();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', password: 'Pass@1234' }),
        }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/login/mfa',
      search: { challengeId: 'ch_123' },
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('logs in and navigates to /booking/checkout when a checkout intent was pending', async () => {
    mockStartCheckoutAfterLogin.mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          mfaRequired: false,
          accessToken: 'token_123',
          user: { id: 'u_1', email: 'test@example.com', role: 'guest' },
        }),
    });

    render(<LoginPage />);
    fillAndSubmit();

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('token_123', {
        id: 'u_1',
        email: 'test@example.com',
        role: 'guest',
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/booking/checkout' });
    expect(mockHasHeldReservation).not.toHaveBeenCalled();
  });

  it('navigates to / when no intent and no held reservation', async () => {
    mockStartCheckoutAfterLogin.mockReturnValue(false);
    mockHasHeldReservation.mockResolvedValue(false);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          mfaRequired: false,
          accessToken: 'token_123',
          user: { id: 'u_1', email: 'test@example.com', role: 'guest' },
        }),
    });

    render(<LoginPage />);
    fillAndSubmit();

    await waitFor(() => {
      expect(mockHasHeldReservation).toHaveBeenCalledWith('token_123', 'u_1');
    });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
  });

  it('navigates to /trips when no intent but user has a held reservation', async () => {
    mockStartCheckoutAfterLogin.mockReturnValue(false);
    mockHasHeldReservation.mockResolvedValue(true);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          mfaRequired: false,
          accessToken: 'token_123',
          user: { id: 'u_1', email: 'test@example.com', role: 'guest' },
        }),
    });

    render(<LoginPage />);
    fillAndSubmit();

    await waitFor(() => {
      expect(mockHasHeldReservation).toHaveBeenCalledWith('token_123', 'u_1');
    });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/trips' });
  });
});
