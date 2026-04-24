import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckoutForm } from './CheckoutForm';

const mockNavigate = jest.fn();
const mockConfirmCardPayment = jest.fn();
const mockGetElement = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../../context/LocaleContext', () => ({
  useLocale: () => ({ currency: 'USD' }),
}));

jest.mock('@stripe/react-stripe-js', () => ({
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({ confirmCardPayment: mockConfirmCardPayment }),
  useElements: () => ({ getElement: mockGetElement }),
}));

jest.mock('../../env', () => ({ API_BASE: 'http://localhost:3000' }));

const RESERVATION = {
  id: 'res_123',
  grandTotalUsd: 250,
  holdExpiresAt: '2026-06-01T00:15:00Z',
  fareBreakdown: {
    nights: 2,
    roomRateUsd: 100,
    subtotalUsd: 200,
    taxes: [],
    fees: [],
    taxTotalUsd: 0,
    feeTotalUsd: 0,
    totalUsd: 250,
  },
};

const INTENT = {
  property: { id: 'prop_1', name: 'Hotel Test' },
  room: { id: 'room_1', type: 'Suite', partnerId: 'partner_1', totalUsd: 250 },
  stay: { checkIn: '2026-06-01', checkOut: '2026-06-03', guests: 2 },
};

function renderForm(overrides: Partial<React.ComponentProps<typeof CheckoutForm>> = {}) {
  return render(
    <CheckoutForm
      reservation={RESERVATION}
      intent={INTENT}
      email="user@example.com"
      firstName="Juan"
      lastName="García"
      phone="+52 123 456 7890"
      {...overrides}
    />,
  );
}

function getForm() {
  return screen.getByRole('button', { name: /Reservar/i }).closest('form')!;
}

describe('CheckoutForm', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockConfirmCardPayment.mockReset();
    mockGetElement.mockReset();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders guest fields pre-filled from props', () => {
      renderForm();
      expect(screen.getByDisplayValue('Juan')).toBeInTheDocument();
      expect(screen.getByDisplayValue('García')).toBeInTheDocument();
      expect(screen.getByDisplayValue('user@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+52 123 456 7890')).toBeInTheDocument();
    });

    it('renders with empty string defaults when optional props are omitted', () => {
      renderForm({ firstName: undefined, lastName: undefined, phone: undefined });
      const inputs = screen.getAllByRole('textbox');
      // firstName and lastName should be empty
      expect(inputs[0]).toHaveValue('');
      expect(inputs[1]).toHaveValue('');
    });

    it('renders the Stripe CardElement', () => {
      renderForm();
      expect(screen.getByTestId('card-element')).toBeInTheDocument();
    });

    it('renders the submit button with the reservation total', () => {
      renderForm();
      expect(screen.getByRole('button', { name: /Reservar/i })).toBeInTheDocument();
    });

    it('renders the "Finalizar después" button', () => {
      renderForm();
      expect(screen.getByRole('button', { name: 'Finalizar después' })).toBeInTheDocument();
    });

    it('renders Google Pay and PayPal as disabled options', () => {
      renderForm();
      expect(screen.getByText('Google Pay')).toBeInTheDocument();
      expect(screen.getByText('Paypal')).toBeInTheDocument();
      const googlePayRadio = screen.getByRole('radio', { name: 'Google Pay' });
      expect(googlePayRadio).toBeDisabled();
    });

    it('renders the cancellation policy section', () => {
      renderForm();
      expect(screen.getByText('No reembolsable')).toBeInTheDocument();
    });
  });

  describe('field editing', () => {
    it('allows editing the first name field', () => {
      renderForm();
      const input = screen.getByDisplayValue('Juan') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Pedro' } });
      expect(input.value).toBe('Pedro');
    });

    it('allows editing the last name field', () => {
      renderForm();
      const input = screen.getByDisplayValue('García') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'López' } });
      expect(input.value).toBe('López');
    });

    it('allows editing the email field', () => {
      renderForm();
      const input = screen.getByDisplayValue('user@example.com') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'nuevo@example.com' } });
      expect(input.value).toBe('nuevo@example.com');
    });

    it('allows editing the phone field', () => {
      renderForm();
      const input = screen.getByDisplayValue('+52 123 456 7890') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '+52 999 888 7777' } });
      expect(input.value).toBe('+52 999 888 7777');
    });
  });

  describe('handleSubmit — error paths', () => {
    it('shows error when the Stripe card element is not found', async () => {
      mockGetElement.mockReturnValue(null);
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(screen.getByText('Card element not found')).toBeInTheDocument();
      });
    });

    it('shows error when the guest-info PATCH request fails', async () => {
      mockGetElement.mockReturnValue({});
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(
          screen.getByText('Error guardando los datos del huésped. Intenta de nuevo.'),
        ).toBeInTheDocument();
      });
    });

    it('shows error when the guest-info PATCH throws a network error', async () => {
      mockGetElement.mockReturnValue({});
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(
          screen.getByText('Error guardando los datos del huésped. Intenta de nuevo.'),
        ).toBeInTheDocument();
      });
    });

    it('shows error when the payment initiation request fails', async () => {
      mockGetElement.mockReturnValue({});
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // PATCH guest info
        .mockResolvedValueOnce({ ok: false }); // POST payment initiate
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(
          screen.getByText('Error iniciando el pago. Intenta de nuevo.'),
        ).toBeInTheDocument();
      });
    });

    it('shows error when the payment initiation throws a network error', async () => {
      mockGetElement.mockReturnValue({});
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error('Network error'));
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(
          screen.getByText('Error iniciando el pago. Intenta de nuevo.'),
        ).toBeInTheDocument();
      });
    });

    it('shows Stripe error message when card payment is declined', async () => {
      mockGetElement.mockReturnValue({});
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ clientSecret: 'secret_123' }),
        });
      mockConfirmCardPayment.mockResolvedValue({ error: { message: 'Tu tarjeta fue rechazada.' } });
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(screen.getByText('Tu tarjeta fue rechazada.')).toBeInTheDocument();
      });
    });
  });

  describe('handleSubmit — success path', () => {
    it('navigates to the confirmation page after a successful payment', async () => {
      mockGetElement.mockReturnValue({});
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ clientSecret: 'secret_123' }),
        });
      mockConfirmCardPayment.mockResolvedValue({ error: null });
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.objectContaining({
            to: '/booking/confirmation',
            search: expect.objectContaining({ reservationId: 'res_123' }),
          }),
        );
      });
    });
  });
});
