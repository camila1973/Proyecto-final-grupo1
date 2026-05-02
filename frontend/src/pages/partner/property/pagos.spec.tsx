import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../i18n/test-utils';
import { LocaleProvider } from '../../../context/LocaleContext';
import { AuthContext } from '../../../context/auth-context';
import PagosPropertyPage from './pagos';

setupTestI18n('es');

const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ propertyId: 'prop-abc' }),
}));

const PAYMENT_ROW = {
  reservationId: 'res-uuid-1234',
  status: 'captured',
  paymentMethod: 'STRIPE',
  reference: 'pi_test_abc123',
  nights: 3,
  ratePerNightUsd: 150000,
  subtotalUsd: 450000,
  taxesUsd: 85500,
  totalPaidUsd: 535500,
  commissionUsd: -107100,
  earningsUsd: 428400,
  createdAt: '2026-05-10T00:00:00Z',
};

const PAYMENTS_RESPONSE = {
  partnerId: 'partner-1',
  month: null,
  total: 1,
  page: 1,
  pageSize: 20,
  rows: [PAYMENT_ROW],
};

const MOCK_AUTH = {
  token: 'test-token',
  user: { id: 'usr-1', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

function renderPage(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue as never}>
        <LocaleProvider>
          <PagosPropertyPage />
        </LocaleProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('PagosPropertyPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(PAYMENTS_RESPONSE),
    }) as never;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows login required alert when unauthenticated', () => {
    renderPage({ token: null, user: null, login: jest.fn(), logout: jest.fn() } as never);
    expect(screen.getByText('Inicia sesión como socio para ver el panel.')).toBeInTheDocument();
  });

  it('renders payment title and payment row', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('STRIPE')).toBeInTheDocument();
    });
    expect(screen.getByText('pi_test_abc123')).toBeInTheDocument();
  });

  it('renders payment status in uppercase', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('CAPTURED')).toBeInTheDocument();
    });
  });

  it('shows empty state when no payments returned', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...PAYMENTS_RESPONSE, total: 0, rows: [] }),
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No hay pagos para mostrar.')).toBeInTheDocument();
    });
  });

  it('shows error alert on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No se pudieron cargar las métricas. Inténtalo más tarde.')).toBeInTheDocument();
    });
  });

  it('filters rows by reservationId', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('STRIPE')).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText('# Referencia');
    fireEvent.change(input, { target: { value: 'no-match' } });
    expect(screen.queryByText('STRIPE')).not.toBeInTheDocument();
    expect(screen.getByText('No hay pagos para mostrar.')).toBeInTheDocument();
  });

  it('filters rows by reference', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('pi_test_abc123')).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText('# Referencia');
    fireEvent.change(input, { target: { value: 'pi_test' } });
    expect(screen.getByText('pi_test_abc123')).toBeInTheDocument();
  });

  it('navigates back to property dashboard on back button', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('STRIPE')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('← Mis hoteles'));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/mi-hotel/$propertyId',
      params: { propertyId: 'prop-abc' },
    });
  });

  it('paginates when multiple pages exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...PAYMENTS_RESPONSE, total: 50 }),
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('STRIPE')).toBeInTheDocument();
    });
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;
    fireEvent.click(screen.getByLabelText('Página siguiente'));
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
