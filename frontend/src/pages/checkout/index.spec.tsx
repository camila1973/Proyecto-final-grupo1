import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage from './index';
import { AuthContext } from '../../context/auth-context';

const mockNavigate = jest.fn();
const mockUseSearch = jest.fn();

const mockConfirmCardPayment = jest.fn();
const mockGetElement = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardElement: () => <div>card-element</div>,
  useStripe: () => ({ confirmCardPayment: mockConfirmCardPayment }),
  useElements: () => ({ getElement: mockGetElement }),
}));

function renderPage(user: { id: string; email: string; role: string } | null) {
  return render(
    <AuthContext.Provider
      value={{
        token: user ? 'token' : null,
        user,
        login: jest.fn(),
        logout: jest.fn(),
      }}
    >
      <CheckoutPage />
    </AuthContext.Provider>,
  );
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    mockUseSearch.mockReturnValue({
      roomId: 'room_1',
      propertyId: 'prop_1',
      partnerId: 'partner_1',
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
      guests: '2',
      propertyName: 'Hotel Test',
      roomType: 'Suite',
      totalUsd: '250',
    });
    global.fetch = jest.fn();
    mockConfirmCardPayment.mockReset();
    mockGetElement.mockReset();
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
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    renderPage({ id: 'u1', email: 'user@example.com', role: 'guest' });

    expect(await screen.findByText('No se pudo crear la reserva. Intenta de nuevo.')).toBeInTheDocument();
  });

  it('submits payment and navigates to confirmation on success', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
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
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clientSecret: 'cs_test' }),
      });

    mockGetElement.mockReturnValue({ id: 'card_element' });
    mockConfirmCardPayment.mockResolvedValue({});

    renderPage({ id: 'u1', email: 'user@example.com', role: 'guest' });

    expect(await screen.findByText('Resumen de reserva')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y pagar $250.00' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/payment/payments/initiate'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/booking/confirmation',
        search: {
          reservationId: 'res_123',
          propertyName: 'Hotel Test',
          roomType: 'Suite',
          checkIn: '2026-06-01',
          checkOut: '2026-06-03',
          totalUsd: '250',
        },
      });
    });
  });
});
