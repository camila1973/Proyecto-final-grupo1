import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckoutForm } from './CheckoutForm';

const mockNavigate = jest.fn();
const mockConfirmPayment = jest.fn();
const mockSubmitElements = jest.fn();

// Mutable so individual tests can set stripe/elements to null
let mockStripe: Record<string, jest.Mock> | null = { confirmPayment: mockConfirmPayment };
let mockElements: Record<string, jest.Mock> | null = { submit: mockSubmitElements };

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../../context/LocaleContext', () => ({
  useLocale: () => ({ currency: 'USD' }),
}));

jest.mock('@stripe/react-stripe-js', () => ({
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
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
  return document.querySelector<HTMLFormElement>('#checkout-form')!;
}

describe('CheckoutForm', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockConfirmPayment.mockReset();
    mockSubmitElements.mockReset();
    mockNavigate.mockReset();
    // Restore stripe/elements to their default truthy values
    mockStripe = { confirmPayment: mockConfirmPayment };
    mockElements = { submit: mockSubmitElements };
    // Default: elements.submit() succeeds with no error
    mockSubmitElements.mockResolvedValue({ error: undefined });
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
      expect(inputs[0]).toHaveValue('');
      expect(inputs[1]).toHaveValue('');
    });

    it('renders the Stripe PaymentElement', () => {
      renderForm();
      expect(screen.getByTestId('payment-element')).toBeInTheDocument();
    });

    it('renders the cancellation policy section', () => {
      renderForm();
      expect(screen.getByText('Tarifa no reembolsable')).toBeInTheDocument();
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
    it('shows error when elements.submit() returns an error', async () => {
      mockSubmitElements.mockResolvedValue({ error: { message: 'Formulario inválido' } });
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(screen.getByText('Formulario inválido')).toBeInTheDocument();
      });
    });

    it('shows error when the guest-info PATCH request fails', async () => {
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

    it('shows Stripe error message when payment is declined', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // PATCH guest info
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ clientSecret: 'secret_123' }),
        }) // POST initiate
        .mockResolvedValueOnce({ ok: true }); // PATCH submit
      mockConfirmPayment.mockResolvedValue({ error: { message: 'Tu tarjeta fue rechazada.' } });
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(screen.getByText('Tu tarjeta fue rechazada.')).toBeInTheDocument();
      });
    });
  });

  describe('handleSubmit — guard: stripe not ready', () => {
    it('does nothing when stripe is not loaded', () => {
      mockStripe = null;

      renderForm();
      fireEvent.submit(getForm());

      // No error shown, no navigation
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert', { name: /error/i })).toBeNull();
    });
  });

  describe('handleSubmit — error message fallbacks', () => {
    it('shows fallback message when submitError has no message', async () => {
      mockSubmitElements.mockResolvedValue({ error: {} }); // error without message
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(screen.getByText('Error en el formulario de pago')).toBeInTheDocument();
      });
    });

    it('shows fallback message when stripeError has no message', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // PATCH guest info
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ clientSecret: 'secret_123' }),
        }) // POST initiate
        .mockResolvedValueOnce({ ok: true }); // PATCH submit
      mockConfirmPayment.mockResolvedValue({ error: {} }); // error without message
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(screen.getByText('Error procesando el pago')).toBeInTheDocument();
      });
    });
  });

  describe('handleSubmit — setLoading prop callback', () => {
    it('calls setLoading(true) when submit starts and setLoading(false) on error', async () => {
      const setLoading = jest.fn();
      mockSubmitElements.mockResolvedValue({ error: { message: 'Formulario inválido' } });
      renderForm({ setLoading });
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(screen.getByText('Formulario inválido')).toBeInTheDocument();
      });
      expect(setLoading).toHaveBeenCalledWith(true);
      expect(setLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('handleSubmit — success path', () => {
    it('navigates to the confirmation page after a successful payment', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // PATCH guest info
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ clientSecret: 'secret_123' }),
        }) // POST initiate
        .mockResolvedValueOnce({ ok: true }); // PATCH submit
      mockConfirmPayment.mockResolvedValue({ error: null });
      renderForm();
      fireEvent.submit(getForm());
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.objectContaining({
            to: '/booking/confirmation/$id',
            params: { id: 'res_123' },
          }),
        );
      });
    });
  });
});
