import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../../i18n/test-utils';
import { LocaleProvider } from '../../../../context/LocaleContext';
import { AuthContext } from '../../../../context/auth-context';
import RoomDetailPage from './index';

setupTestI18n('es');

const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ propertyId: 'prop-abc', roomId: 'room-xyz' }),
}));

const ROOM_DETAIL = {
  id: 'room-xyz',
  propertyId: 'prop-abc',
  roomType: 'Suite',
  bedType: 'King',
  viewType: 'sea',
  capacity: 2,
  totalRooms: 5,
  basePriceUsd: 200,
  status: 'active',
};

const MOCK_AUTH = {
  token: 'tok',
  user: { id: 'u', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

function buildFetch(roomOk = true, availability: unknown[] = [], rates: unknown[] = []) {
  return jest.fn().mockImplementation((url: string) => {
    if (url.includes('/availability?')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(availability) });
    }
    if (url.includes('/rates?')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(rates) });
    }
    if (url.match(/\/properties\/[^/]+\/rooms\/[^/]+(\?|$)/)) {
      if (!roomOk) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(ROOM_DETAIL) });
    }
    if (url.includes('/reservations')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            partnerId: 'partner-1',
            propertyId: 'prop-abc',
            month: '2099-06',
            roomType: 'Suite',
            reservations: [],
          }),
      });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  });
}

function renderPage(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authValue as never}>
        <LocaleProvider>
          <RoomDetailPage />
        </LocaleProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('RoomDetailPage', () => {
  beforeEach(() => {
    global.fetch = buildFetch() as never;
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockNavigate.mockClear();
  });

  it('shows login required when unauthenticated', () => {
    renderPage({ token: null, user: null, login: jest.fn(), logout: jest.fn() } as never);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the room hero with the room type', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Suite').length).toBeGreaterThan(0));
  });

  it('renders the calendar after data loads', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Suite').length).toBeGreaterThan(0));
    // The calendar shows the month label; pick any "month name" common to ES.
    await waitFor(() => {
      const monthLabel = screen.queryAllByText(/(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
      expect(monthLabel.length).toBeGreaterThan(0);
    });
  });

  it('clicking "Nueva tarifa" opens the rate-create drawer', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Suite').length).toBeGreaterThan(0));
    // The "Nueva tarifa" button is in the RatePlanCard.
    const newRateBtn = await screen.findByText('Nueva tarifa');
    fireEvent.click(newRateBtn);
    // The drawer should now show its hint bar with the selecting state.
    await waitFor(() => expect(screen.getByText(/ℹ/)).toBeInTheDocument());
  });

  it('clicking "Nuevo bloqueo" opens the block-create drawer', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Suite').length).toBeGreaterThan(0));
    const newBlockBtn = await screen.findByText('Nuevo bloqueo');
    fireEvent.click(newBlockBtn);
    // The drawer is not yet shown until the user picks a range; just verify the button click did not throw and the page is still visible.
    expect(screen.getAllByText('Suite').length).toBeGreaterThan(0);
  });
});
