import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../i18n/test-utils';
import { LocaleProvider } from '../../../context/LocaleContext';
import { AuthContext } from '../../../context/auth-context';
import PagosPage from '.';

setupTestI18n('es');

const PAYMENTS = {
  partnerId: 'partner-1',
  month: null,
  total: 1,
  page: 1,
  pageSize: 20,
  rows: [
    {
      reservationId: '12345abcdef',
      status: 'pendiente',
      paymentMethod: 'STRIPE',
      reference: 'pal_123456',
      nights: 8,
      ratePerNightUsd: 147500,
      subtotalUsd: 1180000,
      taxesUsd: 224200,
      totalPaidUsd: 1440200,
      commissionUsd: -288040,
      earningsUsd: 1152160,
      createdAt: '2026-03-02T00:00:00Z',
    },
  ],
};

const MOCK_AUTH = {
  token: 'test-token',
  user: { id: 'usr-1', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

function renderPage(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue as never}>
        <LocaleProvider>
          <PagosPage />
        </LocaleProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('PagosPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(PAYMENTS),
    }) as never;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders payments title and payment row', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Pagos')).toBeInTheDocument();
      expect(screen.getByText('STRIPE')).toBeInTheDocument();
      expect(screen.getByText('pal_123456')).toBeInTheDocument();
    });
  });

  it('filters by reference', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('pal_123456')).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText('# Referencia');
    fireEvent.change(input, { target: { value: 'no-match' } });
    expect(screen.queryByText('pal_123456')).not.toBeInTheDocument();
  });

  it('shows error alert on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('No se pudieron cargar las métricas. Inténtalo más tarde.'),
      ).toBeInTheDocument();
    });
  });

  it('shows login-required alert when unauthenticated', () => {
    renderPage({
      token: null,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
    } as never);
    expect(
      screen.getByText('Inicia sesión como socio para ver el panel.'),
    ).toBeInTheDocument();
  });

  it('paginates with prev/next when more than one page exists', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...PAYMENTS, total: 50 }),
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
    const callsAfterNext = (global.fetch as jest.Mock).mock.calls.length;
    fireEvent.click(screen.getByLabelText('Página anterior'));
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsAfterNext);
    });
  });

  it('shows empty-state row when no payments are returned', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...PAYMENTS, total: 0, rows: [] }),
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No hay pagos para mostrar.')).toBeInTheDocument();
    });
  });
});
