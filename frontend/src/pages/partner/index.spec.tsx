import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../i18n/test-utils';
import { LocaleProvider } from '../../context/LocaleContext';
import { AuthContext } from '../../context/auth-context';
import MiHotelPage from '.';

setupTestI18n('es');

const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('recharts', () => {
  const React = jest.requireActual('react');
  const Stub = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);
  return {
    ResponsiveContainer: Stub,
    BarChart: Stub,
    LineChart: Stub,
    Bar: () => null,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

const PROPERTIES_RESPONSE = {
  partnerId: 'partner-1',
  properties: [
    {
      propertyId: 'prop-abc',
      propertyName: 'Hotel Central Park',
      propertyCity: 'Bogotá',
      propertyNeighborhood: 'Chapinero',
      propertyCountryCode: 'CO',
      propertyThumbnailUrl: null,
      roomCount: 3,
      reservationCount: 12,
    },
  ],
};

const METRICS_RESPONSE = {
  partnerId: 'partner-1',
  month: '2026-05',
  roomType: null,
  metrics: { confirmed: 3, cancelled: 1, revenueUsd: 1000, lossesUsd: 100, netUsd: 900 },
  monthlySeries: [
    { month: '2026-05', revenueUsd: 1000, lossesUsd: 50, occupancyRate: 0.68 },
  ],
};

const DISBURSEMENT_RESPONSE = {
  partnerId: 'partner-1',
  periodStart: '2026-05-01',
  periodEnd: '2026-06-01',
  scheduledFor: '2026-06-01',
  currency: 'USD',
  status: 'projected',
  paidAt: null,
  externalTransferRef: null,
  totals: { gross: 0, tax: 0, partnerFee: 0, commission: 0, net: 0 },
  byProperty: [],
  paymentCount: 0,
};

const PARTNER_DETAILS_RESPONSE = {
  id: 'partner-1',
  name: 'Test Partner Org',
  slug: 'test-partner',
  identifier: 'PAR-0001',
  status: 'active',
};

const MOCK_AUTH = {
  token: 'test-token',
  user: { id: 'usr-1', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

function mockFetch(overrides: { propertiesOk?: boolean } = {}) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    const { propertiesOk = true } = overrides;
    if ((url as string).includes('/properties/') && (url as string).includes('/metrics')) {
      if (!propertiesOk) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(METRICS_RESPONSE) });
    }
    if ((url as string).includes('/properties')) {
      if (!propertiesOk) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PROPERTIES_RESPONSE) });
    }
    if ((url as string).includes('/metrics')) {
      if (!propertiesOk) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(METRICS_RESPONSE) });
    }
    if ((url as string).includes('/disbursements')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(DISBURSEMENT_RESPONSE) });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PARTNER_DETAILS_RESPONSE) });
  }) as never;
}

function renderPage(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue as never}>
        <LocaleProvider>
          <MiHotelPage />
        </LocaleProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('MiHotelPage (Resumen)', () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows login required alert when unauthenticated', () => {
    renderPage({ token: null, user: null, login: jest.fn(), logout: jest.fn() } as never);
    expect(
      screen.getByText('Inicia sesión como socio para ver el panel.'),
    ).toBeInTheDocument();
  });

  it('shows error alert when fetch fails', async () => {
    mockFetch({ propertiesOk: false });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('No se pudieron cargar los datos. Inténtalo más tarde.'),
      ).toBeInTheDocument();
    });
  });

  it('renders the KPI metric labels after data loads', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('PROPIEDADES').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('OCUPACIÓN').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('RESERVAS ACTIVAS').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the disbursements preview section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Próximos desembolsos')).toBeInTheDocument();
    });
  });

  it('renders per-property rows from the disbursement payload', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/disbursements')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              ...DISBURSEMENT_RESPONSE,
              status: 'paid',
              totals: { gross: 1000, tax: 190, partnerFee: 50, commission: 200, net: 800 },
              byProperty: [
                {
                  propertyId: 'prop-abc',
                  propertyName: 'Hotel Central Park',
                  gross: 600,
                  tax: 100,
                  partnerFee: 30,
                  commission: 120,
                  net: 480,
                  paymentCount: 2,
                },
              ],
              paymentCount: 2,
            }),
        });
      }
      if ((url as string).includes('/properties/') && (url as string).includes('/metrics')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(METRICS_RESPONSE) });
      }
      if ((url as string).includes('/properties')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PROPERTIES_RESPONSE) });
      }
      if ((url as string).includes('/metrics')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(METRICS_RESPONSE) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PARTNER_DETAILS_RESPONSE) });
    }) as never;

    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Pagado').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('Hotel Central Park').length).toBeGreaterThanOrEqual(1);
  });
});
