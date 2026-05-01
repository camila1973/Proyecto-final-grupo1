import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../i18n/test-utils';
import PartnerRegisterPage from '.';

setupTestI18n('en');

const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../utils/queries', () => ({
  registerPartner: jest.fn(),
}));

import { registerPartner } from '../../../utils/queries';
const mockRegisterPartner = registerPartner as jest.Mock;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PartnerRegisterPage />
    </QueryClientProvider>,
  );
}

function fillValidForm(overrides: Record<string, string> = {}) {
  const vals = {
    orgName: 'Acme Hotels',
    slug: 'acme-hotels',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@acme.com',
    password: 'Secret@123',
    confirm: 'Secret@123',
    ...overrides,
  };
  fireEvent.change(screen.getByLabelText('ORGANIZATION NAME'), { target: { value: vals.orgName } });
  fireEvent.change(screen.getByLabelText('UNIQUE IDENTIFIER'), { target: { value: vals.slug } });
  fireEvent.change(screen.getByLabelText('FIRST NAME'), { target: { value: vals.firstName } });
  fireEvent.change(screen.getByLabelText('LAST NAME'), { target: { value: vals.lastName } });
  fireEvent.change(screen.getByLabelText('EMAIL ADDRESS'), { target: { value: vals.email } });
  fireEvent.change(screen.getByLabelText('PASSWORD'), { target: { value: vals.password } });
  fireEvent.change(screen.getByLabelText('CONFIRM PASSWORD'), { target: { value: vals.confirm } });
}

describe('PartnerRegisterPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockRegisterPartner.mockReset();
  });

  it('renders the form title and submit button', () => {
    renderPage();
    expect(screen.getByText('Register your organization')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create partner account/i })).toBeInTheDocument();
  });

  it('auto-generates slug from org name while slug is untouched', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('ORGANIZATION NAME'), {
      target: { value: 'Acme Hotels & Resorts' },
    });
    expect(screen.getByLabelText<HTMLInputElement>('UNIQUE IDENTIFIER').value).toBe(
      'acme-hotels-resorts',
    );
  });

  it('stops auto-generating slug once user edits it manually', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('ORGANIZATION NAME'), {
      target: { value: 'Acme Hotels' },
    });
    fireEvent.change(screen.getByLabelText('UNIQUE IDENTIFIER'), {
      target: { value: 'my-custom-slug' },
    });
    fireEvent.change(screen.getByLabelText('ORGANIZATION NAME'), {
      target: { value: 'Acme Hotels New Name' },
    });
    expect(screen.getByLabelText<HTMLInputElement>('UNIQUE IDENTIFIER').value).toBe(
      'my-custom-slug',
    );
  });

  // ─── validation ─────────────────────────────────────────────────────────────

  it('shows required-field errors when submitting empty form', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /create partner account/i }));
    expect(screen.getByText('Organization name is required')).toBeInTheDocument();
    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Email address is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    expect(mockRegisterPartner).not.toHaveBeenCalled();
  });

  it('shows slug format error for invalid characters', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('UNIQUE IDENTIFIER'), {
      target: { value: 'INVALID SLUG!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create partner account/i }));
    expect(
      screen.getByText('Only lowercase letters, numbers and hyphens allowed'),
    ).toBeInTheDocument();
  });

  it('shows password mismatch error', () => {
    renderPage();
    fillValidForm({ confirm: 'different-password' });
    fireEvent.click(screen.getByRole('button', { name: /create partner account/i }));
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('shows password complexity error for missing special char', () => {
    renderPage();
    fillValidForm({ password: 'onlyletters1', confirm: 'onlyletters1' });
    fireEvent.click(screen.getByRole('button', { name: /create partner account/i }));
    expect(
      screen.getByText('Password must include letters, numbers and special characters'),
    ).toBeInTheDocument();
  });

  it('shows password max-length error', () => {
    renderPage();
    const longPass = 'Ab@' + 'x'.repeat(14);
    fillValidForm({ password: longPass, confirm: longPass });
    fireEvent.click(screen.getByRole('button', { name: /create partner account/i }));
    expect(screen.getByText('Password must be at most 16 characters')).toBeInTheDocument();
  });

  it('shows email format error', () => {
    renderPage();
    fillValidForm({ email: 'not-an-email' });
    fireEvent.click(screen.getByRole('button', { name: /create partner account/i }));
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  // ─── successful submission ───────────────────────────────────────────────────

  it('calls registerPartner with trimmed, lowercased fields', async () => {
    mockRegisterPartner.mockResolvedValue({ partner: { id: 'p1', name: 'Acme Hotels', slug: 'acme-hotels' }, challengeId: 'chal-1' });
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /create partner account/i }));
    await waitFor(() => {
      expect(mockRegisterPartner).toHaveBeenCalled();
      expect(mockRegisterPartner.mock.calls[0][0]).toEqual({
        orgName: 'Acme Hotels',
        slug: 'acme-hotels',
        firstName: 'Jane',
        lastName: 'Doe',
        ownerEmail: 'jane@acme.com',
        ownerPassword: 'Secret@123',
      });
    });
  });

  it('navigates to /login/mfa with challengeId on success', async () => {
    mockRegisterPartner.mockResolvedValue({ partner: { id: 'p1', name: 'Acme Hotels', slug: 'acme-hotels' }, challengeId: 'chal-abc' });
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /create partner account/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login/mfa', search: { challengeId: 'chal-abc' } });
    });
  });

  // ─── API errors ──────────────────────────────────────────────────────────────

  it('shows slug conflict error on 409 with slug in message', async () => {
    mockRegisterPartner.mockRejectedValue({ status: 409, body: { message: 'Slug "acme-hotels" is already taken' } });
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /create partner account/i }));
    await waitFor(() => {
      expect(screen.getByText('This identifier is already taken')).toBeInTheDocument();
    });
  });

  it('shows email conflict error on 409 with email in message', async () => {
    mockRegisterPartner.mockRejectedValue({ status: 409, body: { message: 'Email is already registered' } });
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /create partner account/i }));
    await waitFor(() => {
      expect(screen.getByText('This email is already registered')).toBeInTheDocument();
    });
  });

  it('shows generic error alert on non-409 failure', async () => {
    mockRegisterPartner.mockRejectedValue({ status: 500, body: { message: 'Internal Server Error' } });
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /create partner account/i }));
    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });
  });
});
