import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../i18n/test-utils';
import { LocaleProvider } from '../../context/LocaleContext';
import { AuthContext } from '../../context/auth-context';
import MiHotelPage from './MiHotelPage';

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
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

const HOTEL_STATE = {
  partnerId: 'p1',
  month: '2026-03',
  roomType: null,
  metrics: {
    confirmed: 1,
    cancelled: 1,
    revenueUsd: 1180,
    lossesUsd: 590,
    netUsd: 590,
  },
  monthlySeries: [
    { month: '2026-03', revenueUsd: 1180, lossesUsd: 590, occupancyRate: 0.5 },
  ],
  reservations: [
    {
      id: '12345abcdef',
      status: 'pendiente',
      guestName: 'Carlos Garcia',
      guestEmail: 'user@example.com',
      guestPhone: '+50768050496',
      guestCount: 2,
      checkIn: '2026-03-01',
      checkOut: '2026-03-09',
      roomType: 'Doble Superior',
      grandTotalUsd: 1440,
    },
  ],
};

const MOCK_AUTH = {
  token: 'test-token',
  user: { id: 'partner-1', email: 'p@h.com', role: 'partner' },
  login: jest.fn(),
  logout: jest.fn(),
};

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

describe('MiHotelPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(HOTEL_STATE),
    }) as never;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders hotel header and metrics after data loads', async () => {
    renderPage();
    expect(screen.getByText('Hotel Central Park')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('metric-confirmed')).toHaveTextContent('1');
      expect(screen.getByTestId('metric-cancelled')).toHaveTextContent('1');
    });
  });

  it('shows reservation row from API', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Carlos Garcia')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('Doble Superior')).toBeInTheDocument();
    });
  });

  it('filters reservations by reservation id', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Carlos Garcia')).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText('# Reserva');
    fireEvent.change(input, { target: { value: 'no-match' } });
    expect(screen.queryByText('Carlos Garcia')).not.toBeInTheDocument();
  });

  it('navigates back/forward in months by re-fetching', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Carlos Garcia')).toBeInTheDocument();
    });
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;
    fireEvent.click(screen.getByLabelText('Mes siguiente'));
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('shows the login required alert when unauthenticated', () => {
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

  it('shows error alert when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('No se pudieron cargar las métricas. Inténtalo más tarde.'),
      ).toBeInTheDocument();
    });
  });

  it('clicks the previous-month button to refetch', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Carlos Garcia')).toBeInTheDocument();
    });
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;
    fireEvent.click(screen.getByLabelText('Mes anterior'));
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('navigates to payments page when "see all payments" is clicked', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Carlos Garcia')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Ver todos los pagos'));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/mi-hotel/pagos' });
  });

  it('disables prev/next pagination at boundaries', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Carlos Garcia')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Página anterior')).toBeDisabled();
    expect(screen.getByLabelText('Página siguiente')).toBeDisabled();
  });

  it('paginates the reservations table when more than PAGE_SIZE rows', async () => {
    const manyRows = Array.from({ length: 12 }).map((_, i) => ({
      ...HOTEL_STATE.reservations[0],
      id: `${i}-id-zzzzz`,
      guestName: `Guest ${i}`,
    }));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...HOTEL_STATE, reservations: manyRows }),
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Guest 0')).toBeInTheDocument();
    });
    expect(screen.queryByText('Guest 11')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Página siguiente'));
    await waitFor(() => {
      expect(screen.getByText('Guest 11')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('Página anterior'));
    await waitFor(() => {
      expect(screen.getByText('Guest 0')).toBeInTheDocument();
    });
  });

  it('changes the room type filter and refetches', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Carlos Garcia')).toBeInTheDocument();
    });
    const select = screen.getByRole('combobox', { name: /tipo de habitación/i });
    fireEvent.mouseDown(select);
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;
    const option = await screen.findByRole('option', { name: 'Suite' });
    fireEvent.click(option);
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('shows the empty state when there are no reservations', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...HOTEL_STATE, reservations: [] }),
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No hay reservaciones para este mes.')).toBeInTheDocument();
    });
  });
});
