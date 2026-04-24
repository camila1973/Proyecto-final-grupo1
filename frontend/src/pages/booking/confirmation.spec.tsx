import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingConfirmationPage from './confirmation';

const mockNavigate = jest.fn();
const mockUseSearch = jest.fn();
const mockUseParams = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
  useParams: (...args: unknown[]) => mockUseParams(...args),
}));

jest.mock('../../context/LocaleContext', () => ({
  useLocale: () => ({ currency: 'USD' }),
}));

jest.mock('../checkout/SummaryPanel', () => ({
  SummaryPanel: () => <div>Resumen de reserva</div>,
}));

describe('BookingConfirmationPage', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ id: 'res_123' });
    mockUseSearch.mockReturnValue({
      propertyName: 'Hotel Test',
      roomType: 'Suite',
      checkIn: '2026-07-01',
      checkOut: '2026-07-03',
      totalUsd: '250.5',
    });
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
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'captured' }),
    });

    render(<BookingConfirmationPage />);

    expect(await screen.findByText('¡Reserva exitosa!')).toBeInTheDocument();

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

    // After the first failed poll the component stays in the pending spinner state
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
    // Make Date.now() jump past the timeout after the first call (startedAt)
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
