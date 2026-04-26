import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingConfirmationPage from '.';
import { setupTestI18n } from '../../../i18n/test-utils';

setupTestI18n('es');

const mockNavigate = jest.fn();
const mockUseSearch = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

jest.mock('../../../context/LocaleContext', () => ({
  useLocale: () => ({ currency: 'USD' }),
}));

jest.mock('../../../env', () => ({ API_BASE: 'http://localhost:3000' }));

const queryState = { data: null as unknown };
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => queryState,
}));

describe('BookingConfirmationPage', () => {
  const mockReservation = {
    id: 'res_123',
    checkIn: '2026-07-01',
    checkOut: '2026-07-03',
    fareBreakdown: { nights: 2, roomRateUsd: 100, subtotalUsd: 200, taxes: [], fees: [], taxTotalUsd: 0, feeTotalUsd: 0, totalUsd: 200 },
    grandTotalUsd: 200,
    holdExpiresAt: '2026-07-01T15:15:00Z',
    snapshot: {
      propertyName: 'Hotel Test',
      propertyCity: 'Cancún',
      propertyNeighborhood: null,
      propertyCountryCode: 'MX',
      propertyThumbnailUrl: null,
      roomType: 'Suite',
    },
  };

  beforeEach(() => {
    mockUseSearch.mockReturnValue({ reservationId: 'res_123' });
    queryState.data = null;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows pending state while payment is processing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'pending' }),
    });

    render(<BookingConfirmationPage />);

    expect(await screen.findByText('Procesando tu pago…')).toBeInTheDocument();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/payment/payments/res_123/status'),
      );
    });
  });

  it('shows confirmation details when payment is captured', async () => {
    queryState.data = mockReservation;
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'captured' }),
    });

    render(<BookingConfirmationPage />);

    expect(await screen.findByText('Reserva exitosa')).toBeInTheDocument();
    expect(await screen.findByText('Hotel Test')).toBeInTheDocument();
    expect(await screen.findByText('Suite')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver mis reservas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeInTheDocument();
  });

  it('navigates to trips when "Ver mis reservas" is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'captured' }),
    });

    render(<BookingConfirmationPage />);
    await screen.findByText('Reserva exitosa');

    fireEvent.click(screen.getByRole('button', { name: 'Ver mis reservas' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/trips' });
  });

  it('navigates home when "Ir al inicio" is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'captured' }),
    });

    render(<BookingConfirmationPage />);
    await screen.findByText('Reserva exitosa');

    fireEvent.click(screen.getByRole('button', { name: 'Ir al inicio' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
  });

  it('shows failure reason and retry CTA when payment fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'failed', failureReason: 'Pago rechazado por el banco' }),
    });

    render(<BookingConfirmationPage />);

    expect(await screen.findByText('Pago no procesado')).toBeInTheDocument();
    expect(screen.getByText('Pago rechazado por el banco')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
  });

  it('shows default failure message when failureReason is absent', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'failed' }),
    });

    render(<BookingConfirmationPage />);

    expect(await screen.findByText('Pago no procesado')).toBeInTheDocument();
    expect(
      screen.getByText('Tu pago fue rechazado. Intenta con otra tarjeta.'),
    ).toBeInTheDocument();
  });

  it('schedules a retry when the status fetch returns a non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 });

    render(<BookingConfirmationPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/payment/payments/res_123/status'),
      );
    });
    expect(screen.getByText('Procesando tu pago…')).toBeInTheDocument();
  });

  it('schedules a retry when the status fetch throws a network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<BookingConfirmationPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/payment/payments/res_123/status'),
      );
    });
    expect(screen.getByText('Procesando tu pago…')).toBeInTheDocument();
  });

  it('shows timed-out success state when polling exceeds the timeout', async () => {
    let nowCallCount = 0;
    const startTs = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => {
      nowCallCount++;
      return nowCallCount === 1 ? startTs : startTs + 90_001;
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'pending' }),
    });

    render(<BookingConfirmationPage />);

    expect(await screen.findByText('¡Pago recibido!')).toBeInTheDocument();

    jest.restoreAllMocks();
  });
});
