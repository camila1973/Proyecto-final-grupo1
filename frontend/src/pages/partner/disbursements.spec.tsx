import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { setupTestI18n } from '../../i18n/test-utils';
import { LocaleProvider } from '../../context/LocaleContext';
import { AuthContext } from '../../context/auth-context';
import PagosPage from './disbursements';

setupTestI18n('es');

const PARTNER_FIXTURE = { id: 'partner-1', name: 'Hotel Alpha', slug: 'alpha' };

const HISTORY_FIXTURE = {
  partnerId: 'partner-1',
  from: '2025-06-01',
  to: '2026-06-01',
  currency: 'USD',
  totals: { gross: 5000, tax: 800, partnerFee: 0, commission: 1000, net: 4000 },
  paymentCount: 12,
  months: [
    {
      month: '2026-04',
      periodStart: '2026-04-01',
      periodEnd: '2026-05-01',
      scheduledFor: '2026-05-01',
      status: 'paid',
      paidAt: '2026-05-05T10:00:00Z',
      externalTransferRef: 'TR-001',
      totals: { gross: 3000, tax: 500, partnerFee: 0, commission: 600, net: 2400 },
      byProperty: [
        {
          propertyId: 'prop-A',
          propertyName: 'Hotel Alpha',
          gross: 3000,
          tax: 500,
          partnerFee: 0,
          commission: 600,
          net: 2400,
          paymentCount: 6,
        },
      ],
      paymentCount: 6,
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
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue as never}>
          <LocaleProvider>
            <PagosPage />
          </LocaleProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('PagosPage (Desembolsos)', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/disbursements?') || url.includes('/disbursements/by-partner')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(HISTORY_FIXTURE) });
      }
      if (url.includes(`/partners/${PARTNER_FIXTURE.id}`)) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PARTNER_FIXTURE) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as never;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the disbursement history row', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('2026-04')).toBeInTheDocument();
      expect(screen.getAllByText('Hotel Alpha').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows the status chip for each month', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Pagado')).toBeInTheDocument();
    });
  });

  it('shows empty state when no months are returned', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/disbursements?') || url.includes('/disbursements/by-partner')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              ...HISTORY_FIXTURE,
              totals: { gross: 0, tax: 0, partnerFee: 0, commission: 0, net: 0 },
              paymentCount: 0,
              months: [],
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PARTNER_FIXTURE) });
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sin desembolsos en este período')).toBeInTheDocument();
    });
  });

  it('shows login-required alert when unauthenticated', async () => {
    renderPage({
      token: null,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
    } as never);
    expect(
      await screen.findByText('Inicia sesión como socio para ver el panel.'),
    ).toBeInTheDocument();
  });

  it('switches to year mode showing the current year', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('2026-04')).toBeInTheDocument());
    const yearToggle = screen.getByRole('button', { name: /^Año$/i });
    fireEvent.click(yearToggle);
    // The current UTC year should now be visible as a label.
    const currentYear = new Date().getUTCFullYear();
    await waitFor(() => expect(screen.getByText(String(currentYear))).toBeInTheDocument());
  });
});
