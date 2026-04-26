import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../i18n/test-utils';
import TripsPage from '.';
import es from '../../i18n/locales/es.json';

setupTestI18n('es');

const mockNavigate = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../context/LocaleContext', () => ({
  useLocale: () => ({ currency: 'USD' }),
}));

const { useAuth } = jest.requireMock('../../hooks/useAuth') as { useAuth: jest.Mock };

const USER = { id: 'u1', email: 'test@example.com', role: 'guest' };
const TOKEN = 'mock-token';

function makeReservation(status: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'aaaa-bbbb-cccc',
    status,
    checkIn: '2026-06-01T14:00:00Z',
    checkOut: '2026-06-03T12:00:00Z',
    grandTotalUsd: 300,
    createdAt: '2026-05-01T10:00:00Z',
    snapshot: {
      propertyName: 'Hotel Test',
      propertyCity: 'Cancún',
      propertyNeighborhood: 'Centro',
      propertyCountryCode: 'MX',
      propertyThumbnailUrl: null,
      roomType: 'suite',
    },
    ...overrides,
  };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TripsPage />
    </QueryClientProvider>,
  );
}

describe('TripsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('unauthenticated', () => {
    it('redirects to /login when token is missing', () => {
      useAuth.mockReturnValue({ token: null, user: null });
      renderPage();
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
    });
  });

  describe('loading state', () => {
    it('shows a spinner while reservations are loading', () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
      const { container } = renderPage();
      expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when the fetch fails', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      renderPage();
      expect(await screen.findByText(es.trips.error)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [] }),
      });
    });

    it('shows empty message', async () => {
      renderPage();
      expect(await screen.findByText(es.trips.empty)).toBeInTheDocument();
    });

    it('renders the page title', async () => {
      renderPage();
      expect(await screen.findByText(es.trips.title)).toBeInTheDocument();
    });

    it('navigates to home when explore button is clicked', async () => {
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: es.trips.explore }));
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
    });
  });

  describe('active reservations', () => {
    it('renders the active section header', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('confirmed')] }),
      });
      renderPage();
      expect(await screen.findByText(es.trips.section.active)).toBeInTheDocument();
    });

    it('shows confirmed status chip', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('confirmed')] }),
      });
      renderPage();
      expect(await screen.findByText(es.trips.status.confirmed)).toBeInTheDocument();
    });

    it('shows held status chip', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('held')] }),
      });
      renderPage();
      expect(await screen.findByText(es.trips.status.held)).toBeInTheDocument();
    });

    it('shows submitted status chip', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('submitted')] }),
      });
      renderPage();
      expect(await screen.findByText(es.trips.status.submitted)).toBeInTheDocument();
    });

    it('shows cancel button for a held reservation', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('held')] }),
      });
      renderPage();
      expect(await screen.findByRole('button', { name: es.trips.card.cancel })).toBeInTheDocument();
    });
  });

  describe('past reservations', () => {
    it('renders the past section header for cancelled reservations', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('cancelled')] }),
      });
      renderPage();
      expect(await screen.findByText(es.trips.section.past)).toBeInTheDocument();
    });

    it('shows cancelled status chip', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('cancelled')] }),
      });
      renderPage();
      expect(await screen.findByText(es.trips.status.cancelled)).toBeInTheDocument();
    });

    it('shows failed status chip', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('failed')] }),
      });
      renderPage();
      expect(await screen.findByText(es.trips.status.failed)).toBeInTheDocument();
    });

    it('shows expired status chip', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('expired')] }),
      });
      renderPage();
      expect(await screen.findByText(es.trips.status.expired)).toBeInTheDocument();
    });

    it('does not show cancel button for expired reservations', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('expired')] }),
      });
      renderPage();
      await screen.findByText(es.trips.status.expired);
      expect(screen.queryByRole('button', { name: es.trips.card.cancel })).not.toBeInTheDocument();
    });

    it('does not show cancel button for failed reservations', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('failed')] }),
      });
      renderPage();
      await screen.findByText(es.trips.status.failed);
      expect(screen.queryByRole('button', { name: es.trips.card.cancel })).not.toBeInTheDocument();
    });
  });

  describe('reservation card content', () => {
    it('renders property name in uppercase when snapshot is present', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ reservations: [makeReservation('confirmed')] }),
      });
      renderPage();
      expect(await screen.findByText('HOTEL TEST')).toBeInTheDocument();
    });

    it('renders em-dash placeholder when snapshot is null', async () => {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          reservations: [makeReservation('confirmed', { snapshot: null })],
        }),
      });
      renderPage();
      await screen.findByText(es.trips.section.active);
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('cancel flow', () => {
    async function setupWithCancellable(status = 'confirmed') {
      useAuth.mockReturnValue({ token: TOKEN, user: USER });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ reservations: [makeReservation(status)] }),
        })
        .mockResolvedValue({ ok: true });
      renderPage();
      return screen.findByRole('button', { name: es.trips.card.cancel });
    }

    it('opens the cancel dialog when cancel is clicked', async () => {
      const btn = await setupWithCancellable();
      fireEvent.click(btn);
      expect(await screen.findByText(es.trips.cancel_dialog.title)).toBeInTheDocument();
      expect(screen.getByText(es.trips.cancel_dialog.body)).toBeInTheDocument();
    });

    it('closes the dialog when "Mantener" is clicked', async () => {
      const btn = await setupWithCancellable();
      fireEvent.click(btn);
      await screen.findByText(es.trips.cancel_dialog.title);
      fireEvent.click(screen.getByRole('button', { name: es.trips.cancel_dialog.keep }));
      await waitFor(() => {
        expect(screen.queryByText(es.trips.cancel_dialog.title)).not.toBeInTheDocument();
      });
    });

    it('calls the cancel endpoint when confirm cancel is clicked', async () => {
      const btn = await setupWithCancellable();
      fireEvent.click(btn);
      await screen.findByText(es.trips.cancel_dialog.title);
      fireEvent.click(screen.getByRole('button', { name: es.trips.cancel_dialog.confirm }));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/reservations/aaaa-bbbb-cccc/cancel'),
          expect.objectContaining({ method: 'PATCH' }),
        );
      });
    });

    it('cancel button also works for submitted reservations', async () => {
      const btn = await setupWithCancellable('submitted');
      fireEvent.click(btn);
      expect(await screen.findByText(es.trips.cancel_dialog.title)).toBeInTheDocument();
    });
  });
});
