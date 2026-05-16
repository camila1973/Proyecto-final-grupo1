import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../i18n/test-utils';
import { LocaleProvider } from '../../../context/LocaleContext';
import { AuthContext } from '../../../context/auth-context';
import RoomsBody from './rooms';

setupTestI18n('es');

const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ propertyId: 'prop-abc' }),
}));

const ROOMS_RESPONSE = {
  partnerId: 'partner-1',
  propertyId: 'prop-abc',
  month: '2026-05',
  rooms: [
    {
      roomId: 'room-1',
      roomType: 'suite',
      capacity: 2,
      bedType: 'King',
      basePriceUsd: 250,
      totalRooms: 5,
      status: 'active',
      occupancyRate: 0.4,
    },
    {
      roomId: 'room-2',
      roomType: 'standard',
      capacity: 2,
      bedType: 'Queen',
      basePriceUsd: 100,
      totalRooms: 3,
      status: 'inactive',
      occupancyRate: 1,
    },
  ],
};

const MOCK_AUTH = {
  token: 'test-token',
  user: { id: 'u1', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

function renderBody(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authValue as never}>
        <LocaleProvider>
          <RoomsBody />
        </LocaleProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('RoomsBody', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(ROOMS_RESPONSE),
    }) as never;
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockNavigate.mockClear();
  });

  it('shows login required when unauthenticated', () => {
    renderBody({ token: null, user: null, login: jest.fn(), logout: jest.fn() } as never);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders both rooms', async () => {
    renderBody();
    await waitFor(() => expect(screen.getByText('suite')).toBeInTheDocument());
    expect(screen.getByText('standard')).toBeInTheDocument();
  });

  it('renders active and no-stock chips', async () => {
    renderBody();
    await waitFor(() => expect(screen.getByText('Activa')).toBeInTheDocument());
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
  });

  it('filters by room type', async () => {
    renderBody();
    await waitFor(() => expect(screen.getByText('standard')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByLabelText('Tipo de habitación'));
    const option = await screen.findByRole('option', { name: 'suite' });
    fireEvent.click(option);
    // After selecting "suite", the standard row should vanish.
    await waitFor(() => expect(screen.queryByText('standard')).not.toBeInTheDocument());
  });

  it('shows error alert when query fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    renderBody();
    await waitFor(() => {
      expect(
        screen.getByText('No se pudieron cargar las métricas. Inténtalo más tarde.'),
      ).toBeInTheDocument();
    });
  });

  it('opens the room menu and navigates to the room detail', async () => {
    renderBody();
    await waitFor(() => expect(screen.getByText('suite')).toBeInTheDocument());
    const kebabs = screen.getAllByTestId('MoreVertIcon');
    fireEvent.click(kebabs[0]);
    fireEvent.click(await screen.findByText('Ver disponibilidad'));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/mi-hotel/$propertyId/habitaciones/$roomId',
      }),
    );
  });

  it('shows no_rooms empty state when API returns no rooms', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...ROOMS_RESPONSE, rooms: [] }),
    });
    renderBody();
    await waitFor(() => {
      expect(screen.getByText('No hay habitaciones registradas para esta propiedad.')).toBeInTheDocument();
    });
  });
});
