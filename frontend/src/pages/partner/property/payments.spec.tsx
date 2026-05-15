import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../i18n/test-utils';
import { LocaleProvider } from '../../../context/LocaleContext';
import { AuthContext } from '../../../context/auth-context';
import PaymentsBody from './payments';

setupTestI18n('es');

jest.mock('@tanstack/react-router', () => ({
  useParams: () => ({ propertyId: 'prop-abc' }),
}));

const PAYMENT_ROW = {
  reservationId: 'res-uuid-1234',
  propertyId: 'prop-abc',
  propertyName: 'Hotel Test',
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
  propertyId: 'prop-abc',
  from: '2026-05-01',
  to: '2026-06-01',
  total: 1,
  page: 1,
  pageSize: 20,
  totals: {
    gross: 535500,
    commission: -107100,
    net: 428400,
    count: 1,
  },
  rows: [PAYMENT_ROW],
};

const MOCK_AUTH = {
  token: 'test-token',
  user: { id: 'usr-1', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

function renderBody(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue as never}>
        <LocaleProvider>
          <PaymentsBody />
        </LocaleProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('PaymentsBody', () => {
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

  it('renders payment row', async () => {
    renderBody();
    await waitFor(() => {
      expect(screen.getByText('STRIPE')).toBeInTheDocument();
    });
    expect(screen.getByText('pi_test_abc123')).toBeInTheDocument();
  });

  it('renders payment status in uppercase', async () => {
    renderBody();
    await waitFor(() => {
      expect(screen.getByText('CAPTURED')).toBeInTheDocument();
    });
  });

  it('renders KPI cards from totals', async () => {
    renderBody();
    await waitFor(() => {
      expect(screen.getByText('INGRESOS BRUTOS')).toBeInTheDocument();
    });
    expect(screen.getByText('COMISIÓN')).toBeInTheDocument();
    expect(screen.getByText('GANANCIA DEL PROPIETARIO')).toBeInTheDocument();
  });

  it('shows empty state when no payments returned', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...PAYMENTS_RESPONSE,
          total: 0,
          rows: [],
          totals: { gross: 0, commission: 0, net: 0, count: 0 },
        }),
    });
    renderBody();
    await waitFor(() => {
      expect(screen.getByText('No hay pagos para mostrar.')).toBeInTheDocument();
    });
  });

  it('shows error alert on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    renderBody();
    await waitFor(() => {
      expect(
        screen.getByText('No se pudieron cargar las métricas. Inténtalo más tarde.'),
      ).toBeInTheDocument();
    });
  });

  it('filters rows by reservationId', async () => {
    renderBody();
    await waitFor(() => {
      expect(screen.getByText('STRIPE')).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText('# Referencia');
    fireEvent.change(input, { target: { value: 'no-match' } });
    expect(screen.queryByText('STRIPE')).not.toBeInTheDocument();
    expect(screen.getByText('No hay pagos para mostrar.')).toBeInTheDocument();
  });

  it('filters rows by reference', async () => {
    renderBody();
    await waitFor(() => {
      expect(screen.getByText('pi_test_abc123')).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText('# Referencia');
    fireEvent.change(input, { target: { value: 'pi_test' } });
    expect(screen.getByText('pi_test_abc123')).toBeInTheDocument();
  });

  it('paginates when multiple pages exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...PAYMENTS_RESPONSE, total: 50 }),
    });
    renderBody();
    await waitFor(() => {
      expect(screen.getByText('STRIPE')).toBeInTheDocument();
    });
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;
    fireEvent.click(screen.getByLabelText('Página siguiente'));
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('uses the nested payments URL', async () => {
    renderBody();
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    });
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/partners/partner-1/properties/prop-abc/payments');
  });
});
