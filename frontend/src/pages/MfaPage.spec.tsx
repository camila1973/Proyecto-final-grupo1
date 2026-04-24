import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupTestI18n } from '../i18n/test-utils';
import MfaPage from './MfaPage';
import es from '../i18n/locales/es.json';

setupTestI18n('es');

const mockNavigate = jest.fn();
const mockUseSearch = jest.fn();
const mockLogin = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

const mockStartCheckoutAfterLogin = jest.fn();
jest.mock('../hooks/useBookingFlow', () => ({
  startCheckoutAfterLogin: (...args: unknown[]) => mockStartCheckoutAfterLogin(...args),
}));

describe('MfaPage', () => {
  beforeEach(() => {
    mockUseSearch.mockReturnValue({ challengeId: 'ch_123' });
    global.fetch = jest.fn();
    mockStartCheckoutAfterLogin.mockReturnValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('redirects to login when challengeId is missing', async () => {
    mockUseSearch.mockReturnValue({ challengeId: undefined });

    render(<MfaPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
    });
  });

  it('shows validation error for invalid code format', async () => {
    render(<MfaPage />);

    fireEvent.change(screen.getByLabelText(es.mfa.code_label), {
      target: { value: '12' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.mfa.submit }));

    expect(await screen.findByText(es.mfa.errors.code_invalid)).toBeInTheDocument();
  });

  it('shows expired error and retry link on 401 expired response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'challenge expired' }),
    });

    render(<MfaPage />);

    fireEvent.change(screen.getByLabelText(es.mfa.code_label), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.mfa.submit }));

    expect(await screen.findByText(es.mfa.errors.expired)).toBeInTheDocument();
    expect(screen.getByText(es.mfa.try_again_link)).toBeInTheDocument();
  });

  it('shows too_many_attempts error on 401 with attempts message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'too many attempts' }),
    });

    render(<MfaPage />);

    fireEvent.change(screen.getByLabelText(es.mfa.code_label), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.mfa.submit }));

    expect(await screen.findByText(es.mfa.errors.too_many_attempts)).toBeInTheDocument();
    expect(screen.getByText(es.mfa.try_again_link)).toBeInTheDocument();
  });

  it('shows invalid_code error on 401 with unrecognized message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'invalid' }),
    });

    render(<MfaPage />);

    fireEvent.change(screen.getByLabelText(es.mfa.code_label), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.mfa.submit }));

    expect(await screen.findByText(es.mfa.errors.invalid_code)).toBeInTheDocument();
  });

  it('shows generic error on non-401 server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    render(<MfaPage />);

    fireEvent.change(screen.getByLabelText(es.mfa.code_label), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.mfa.submit }));

    expect(await screen.findByText(es.mfa.errors.generic)).toBeInTheDocument();
  });

  it('shows generic error when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<MfaPage />);

    fireEvent.change(screen.getByLabelText(es.mfa.code_label), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.mfa.submit }));

    expect(await screen.findByText(es.mfa.errors.generic)).toBeInTheDocument();
  });

  it('logs in user and navigates home on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          accessToken: 'token_123',
          user: { id: 'u_1', email: 'user@example.com', role: 'guest' },
        }),
    });

    render(<MfaPage />);

    fireEvent.change(screen.getByLabelText(es.mfa.code_label), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.mfa.submit }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('token_123', {
        id: 'u_1',
        email: 'user@example.com',
        role: 'guest',
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
  });

  it('navigates to /booking/checkout when a checkout intent was pending', async () => {
    mockStartCheckoutAfterLogin.mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          accessToken: 'token_123',
          user: { id: 'u_1', email: 'user@example.com', role: 'guest' },
        }),
    });

    render(<MfaPage />);

    fireEvent.change(screen.getByLabelText(es.mfa.code_label), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.mfa.submit }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/booking/checkout' });
    });
  });
});
