import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingConfirmationPage from './confirmation';

const mockNavigate = jest.fn();
const mockUseSearch = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

describe('BookingConfirmationPage', () => {
  beforeEach(() => {
    mockUseSearch.mockReturnValue({
      reservationId: 'res_123',
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

    expect(await screen.findByText('¡Reserva confirmada!')).toBeInTheDocument();
    expect(screen.getByText('Hotel Test')).toBeInTheDocument();
    expect(screen.getByText('USD $250.50')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }));
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
});
