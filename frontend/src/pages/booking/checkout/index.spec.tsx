import { render, screen, waitFor } from '@testing-library/react';
import CheckoutPage from './index';
import { setupTestI18n } from '../../../i18n/test-utils';

setupTestI18n('es');

const mockNavigate = jest.fn();
const mockCreateReservation = jest.fn();
const mockConsumeCheckoutIntent = jest.fn();

const mockConfirmCardPayment = jest.fn();
const mockGetElement = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../hooks/useBookingFlow', () => ({
  peekCheckoutIntent: () => mockConsumeCheckoutIntent(),
  consumeCheckoutIntent: () => mockConsumeCheckoutIntent(),
  consumeReservationPromise: () => null,
  startCheckoutAfterLogin: jest.fn(() => false),
  useBookingFlow: jest.fn(),
}));

jest.mock('../../../context/LocaleContext', () => ({
  useLocale: () => ({ currency: 'USD', setCurrency: jest.fn() }),
}));

jest.mock('../../../env', () => ({ STRIPE_PUBLISHABLE_KEY: 'pk_test_mock', API_BASE: 'http://localhost:3000' }));

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardElement: () => <div>card-element</div>,
  useStripe: () => ({ confirmCardPayment: mockConfirmCardPayment }),
  useElements: () => ({ getElement: mockGetElement }),
}));

jest.mock('./SummaryPanel', () => ({
  SummaryPanel: () => <div>Resumen de reserva</div>,
}));

jest.mock('./CheckoutForm', () => ({
  CheckoutForm: ({ reservation }: { reservation: { id: string } }) => (
    <button>Confirmar y pagar ${reservation.id}</button>
  ),
}));

const { useBookingFlow } = jest.requireMock('../../../hooks/useBookingFlow') as {
  useBookingFlow: jest.Mock;
};

const INTENT = {
  property: { id: 'prop_1', name: 'Hotel Test' },
  room: { id: 'room_1', type: 'Suite', partnerId: 'partner_1', totalUsd: 250 },
  stay: { checkIn: '2026-06-01', checkOut: '2026-06-03', guests: 2 },
};

function setupHook(user: { id: string; email: string; role: string } | null) {
  useBookingFlow.mockReturnValue({
    auth: { token: user ? 'token' : null, user, login: jest.fn(), logout: jest.fn() },
    book: jest.fn(),
    createReservation: mockCreateReservation,
  });
}

function renderPage(user: { id: string; email: string; role: string } | null) {
  setupHook(user);
  return render(<CheckoutPage />);
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    mockConsumeCheckoutIntent.mockReturnValue(INTENT);
    mockCreateReservation.mockReset();
    mockConfirmCardPayment.mockReset();
    mockGetElement.mockReset();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('redirects to login when user is not authenticated', async () => {
    renderPage(null);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
    });
  });

  it('shows reservation error when reservation creation fails', async () => {
    mockCreateReservation.mockRejectedValue(new Error('Hold failed'));

    renderPage({ id: 'u1', email: 'user@example.com', role: 'guest' });

    expect(await screen.findByText(/no se pudo crear la reserva/i)).toBeInTheDocument();
  });

  it('renders the summary panel and checkout form once reservation is created', async () => {
    const reservation = {
      id: 'res_123',
      grandTotalUsd: 250,
      holdExpiresAt: '2026-06-01T00:15:00Z',
      fareBreakdown: {
        nights: 2,
        roomRateUsd: 100,
        subtotalUsd: 200,
        taxes: [{ name: 'IVA', amountUsd: 30 }],
        fees: [{ name: 'Service fee', totalUsd: 20 }],
        taxTotalUsd: 30,
        feeTotalUsd: 20,
        totalUsd: 250,
      },
    };
    mockCreateReservation.mockResolvedValue(reservation);

    renderPage({ id: 'u1', email: 'user@example.com', role: 'guest' });

    expect(await screen.findByText('Resumen de reserva')).toBeInTheDocument();
    expect(mockCreateReservation).toHaveBeenCalledWith(INTENT);
  });
});
