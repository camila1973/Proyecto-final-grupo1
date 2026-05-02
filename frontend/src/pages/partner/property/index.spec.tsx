import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../i18n/test-utils';
import { LocaleProvider } from '../../../context/LocaleContext';
import { AuthContext } from '../../../context/auth-context';
import PropertyDashboardPage from '.';

setupTestI18n('es');

const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ propertyId: 'prop-abc' }),
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

const HOTEL_STATE_RESPONSE = {
  partnerId: 'partner-1',
  month: '2026-05',
  roomType: null,
  metrics: { confirmed: 5, cancelled: 2, revenueUsd: 2000, lossesUsd: 200, netUsd: 1800 },
  monthlySeries: [
    { month: '2026-05', revenueUsd: 2000, lossesUsd: 200, occupancyRate: 0.7 },
  ],
  reservations: [
    {
      id: 'res-uuid-1234',
      status: 'confirmed',
      guestName: 'María López',
      guestEmail: 'maria@test.com',
      guestPhone: '+573001234567',
      guestCount: 2,
      checkIn: '2026-05-10',
      checkOut: '2026-05-13',
      roomType: 'Doble Superior',
    },
  ],
};

const MOCK_AUTH = {
  token: 'test-token',
  user: { id: 'usr-1', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

const PROPERTY_RESPONSE = {
  propertyId: 'prop-abc',
  propertyName: 'Hotel Test',
  propertyCity: 'Bogotá',
  propertyNeighborhood: null,
  propertyCountryCode: 'CO',
  propertyThumbnailUrl: null,
  roomCount: 0,
  reservationCount: 0,
};

function mockFetch(ok = true) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    let body: unknown;
    if ((url as string).includes('/reservations')) {
      body = {
        partnerId: 'partner-1',
        propertyId: 'prop-abc',
        month: '2026-05',
        roomType: null,
        reservations: HOTEL_STATE_RESPONSE.reservations,
      };
    } else if ((url as string).match(/\/properties\/[^/]+$/)) {
      body = PROPERTY_RESPONSE;
    } else {
      body = {
        partnerId: 'partner-1',
        propertyId: 'prop-abc',
        month: '2026-05',
        roomType: null,
        metrics: HOTEL_STATE_RESPONSE.metrics,
        monthlySeries: HOTEL_STATE_RESPONSE.monthlySeries,
      };
    }
    return Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(body),
    });
  }) as never;
}

function renderPage(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue as never}>
        <LocaleProvider>
          <PropertyDashboardPage />
        </LocaleProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('PropertyDashboardPage', () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows login required alert when unauthenticated', () => {
    renderPage({ token: null, user: null, login: jest.fn(), logout: jest.fn() } as never);
    expect(screen.getByText('Inicia sesión como socio para ver el panel.')).toBeInTheDocument();
  });

  it('renders metric cards after data loads', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('metric-confirmed')).toBeInTheDocument();
    });
    expect(screen.getByTestId('metric-cancelled')).toBeInTheDocument();
    expect(screen.getByTestId('metric-revenue')).toBeInTheDocument();
    expect(screen.getByTestId('metric-losses')).toBeInTheDocument();
    expect(screen.getByTestId('metric-net')).toBeInTheDocument();
  });

  it('renders reservation row in table', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
    expect(screen.getByText('maria@test.com')).toBeInTheDocument();
  });

  it('shows empty state when no reservations', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const body = (url as string).includes('/reservations')
        ? {
            partnerId: 'partner-1',
            propertyId: 'prop-abc',
            month: '2026-05',
            roomType: null,
            reservations: [],
          }
        : {
            partnerId: 'partner-1',
            propertyId: 'prop-abc',
            month: '2026-05',
            roomType: null,
            metrics: HOTEL_STATE_RESPONSE.metrics,
            monthlySeries: HOTEL_STATE_RESPONSE.monthlySeries,
          };
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
    }) as never;
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No hay reservaciones para este mes.')).toBeInTheDocument();
    });
  });

  it('shows error alert on fetch failure', async () => {
    mockFetch(false);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No se pudieron cargar las métricas. Inténtalo más tarde.')).toBeInTheDocument();
    });
  });

  it('navigates to pagos page on link click', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Ver todos los pagos')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Ver todos los pagos'));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/mi-hotel/$propertyId/pagos',
      params: { propertyId: 'prop-abc' },
    });
  });

  it('filters reservations by search term', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('# Reserva');
    fireEvent.change(searchInput, { target: { value: 'no-match' } });
    expect(screen.queryByText('María López')).not.toBeInTheDocument();
    expect(screen.getByText('No hay reservaciones para este mes.')).toBeInTheDocument();
  });

  it('navigates month backward and forward', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('metric-confirmed')).toBeInTheDocument();
    });
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;
    fireEvent.click(screen.getByLabelText('Mes anterior'));
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
