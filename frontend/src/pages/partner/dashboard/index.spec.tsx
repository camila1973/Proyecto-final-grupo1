import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../i18n/test-utils';
import { LocaleProvider } from '../../../context/LocaleContext';
import { AuthContext } from '../../../context/auth-context';
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
    {
      propertyId: 'prop-def',
      propertyName: 'Suite Zen',
      propertyCity: 'Medellín',
      propertyNeighborhood: null,
      propertyCountryCode: 'CO',
      propertyThumbnailUrl: null,
      roomCount: 1,
      reservationCount: 5,
    },
  ],
};

const METRICS_RESPONSE = {
  partnerId: 'partner-1',
  month: '2026-05',
  roomType: null,
  metrics: { confirmed: 3, cancelled: 1, revenueUsd: 1000, lossesUsd: 100, netUsd: 900 },
  monthlySeries: [
    { month: '2025-12', revenueUsd: 200, lossesUsd: 10, occupancyRate: 0.5 },
    { month: '2026-01', revenueUsd: 300, lossesUsd: 20, occupancyRate: 0.55 },
    { month: '2026-02', revenueUsd: 400, lossesUsd: 15, occupancyRate: 0.6 },
    { month: '2026-03', revenueUsd: 600, lossesUsd: 30, occupancyRate: 0.65 },
    { month: '2026-04', revenueUsd: 800, lossesUsd: 40, occupancyRate: 0.7 },
    { month: '2026-05', revenueUsd: 1000, lossesUsd: 50, occupancyRate: 0.68 },
  ],
};

const PAYMENTS_RESPONSE = {
  partnerId: 'partner-1',
  month: '2026-05',
  total: 0,
  page: 1,
  pageSize: 20,
  rows: [],
};

const MOCK_AUTH = {
  token: 'test-token',
  user: { id: 'usr-1', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

const PARTNER_DETAILS_RESPONSE = {
  id: 'partner-1',
  name: 'Test Partner Org',
  slug: 'test-partner',
  identifier: 'PAR-0001',
  status: 'active',
};

function mockFetch(overrides: { propertiesOk?: boolean } = {}) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    const { propertiesOk = true } = overrides;
    // Property-level metrics: /properties/:id/metrics
    if ((url as string).includes('/properties/') && (url as string).includes('/metrics')) {
      if (!propertiesOk) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(METRICS_RESPONSE) });
    }
    // Properties list: /properties
    if ((url as string).includes('/properties')) {
      if (!propertiesOk) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PROPERTIES_RESPONSE) });
    }
    // Partner aggregate metrics: /metrics
    if ((url as string).includes('/metrics')) {
      if (!propertiesOk) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(METRICS_RESPONSE) });
    }
    if ((url as string).includes('/payments')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PAYMENTS_RESPONSE) });
    }
    if ((url as string).includes('/members')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    }
    // Partner details: GET /partners/:id
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

describe('MiHotelPage (org dashboard)', () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows property names after data loads', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Hotel Central Park').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Suite Zen').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows metric cards section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Hotel Central Park').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('PROPIEDADES').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('OCUPACIÓN').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('RESERVAS ACTIVAS').length).toBeGreaterThanOrEqual(1);
  });

  it('shows properties table section header', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Hotel Central Park').length).toBeGreaterThanOrEqual(1);
    });
    const sectionHeaders = screen.getAllByText('Propiedades');
    expect(sectionHeaders.length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to property dashboard on property name click', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Hotel Central Park').length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.click(screen.getAllByText('Hotel Central Park')[0]);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/mi-hotel/$propertyId',
      params: { propertyId: 'prop-abc' },
    });
  });

  it('shows the empty state when there are no properties', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if ((url as string).includes('/properties')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ partnerId: 'partner-1', properties: [] }),
        });
      }
      if ((url as string).includes('/metrics')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(METRICS_RESPONSE) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PAYMENTS_RESPONSE) });
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('No hay propiedades registradas.').length).toBeGreaterThanOrEqual(1);
    });
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

  it('shows login required alert when unauthenticated', () => {
    renderPage({ token: null, user: null, login: jest.fn(), logout: jest.fn() } as never);
    expect(
      screen.getByText('Inicia sesión como socio para ver el panel.'),
    ).toBeInTheDocument();
  });

  it('shows managers section with stub cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Hotel Central Park').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Gestión de gerentes')).toBeInTheDocument();
  });

  it('shows disbursements section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Hotel Central Park').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Próximas dispersiones')).toBeInTheDocument();
  });
});
