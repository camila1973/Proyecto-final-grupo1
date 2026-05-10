import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../../i18n/test-utils';
import { LocaleProvider } from '../../../../context/LocaleContext';
import { AuthContext } from '../../../../context/auth-context';
import ReservationEditPage from './edit';

setupTestI18n('es');

const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ propertyId: 'prop-abc', reservationId: 'res-1234abcd' }),
}));

const RESERVATION = {
  id: 'res-1234abcd',
  status: 'confirmed',
  propertyId: 'prop-abc',
  roomId: 'room-1',
  partnerId: 'partner-1',
  checkIn: '2026-06-01',
  checkOut: '2026-06-04',
  grandTotalUsd: 600,
  createdAt: '2026-05-10T12:00:00Z',
  guestInfo: {
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    phone: '+1234',
  },
  snapshot: {
    propertyName: 'Hotel Test',
    propertyCity: 'Bogotá',
    propertyNeighborhood: 'Chapinero',
    propertyCountryCode: 'CO',
    propertyThumbnailUrl: null,
    roomType: 'Suite',
  },
};

const REFUND_QUOTE = {
  policy: 'partial_refund' as const,
  refundableUsd: 300,
  daysUntilCheckIn: 4,
};

const MOCK_AUTH = {
  token: 'test-token',
  user: { id: 'usr-1', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

interface FetchHandler {
  match: (url: string, init?: RequestInit) => boolean;
  body: unknown;
  ok?: boolean;
}

function installFetch(handlers: FetchHandler[]) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const handler = handlers.find((h) => h.match(url, init));
    if (!handler) {
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({
      ok: handler.ok ?? true,
      status: handler.ok === false ? 500 : 200,
      json: () => Promise.resolve(handler.body),
    });
  }) as never;
  return calls;
}

function renderPage(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue as never}>
        <LocaleProvider>
          <ReservationEditPage />
        </LocaleProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ReservationEditPage', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows login required when unauthenticated', () => {
    renderPage({ token: null, user: null, login: jest.fn(), logout: jest.fn() } as never);
    expect(screen.getByText('Inicia sesión como socio para editar la reserva.')).toBeInTheDocument();
  });

  it('seeds the form with the current reservation values', async () => {
    installFetch([
      { match: (u) => u.includes(`/reservations/res-1234abcd`) && !u.includes('refund'), body: RESERVATION },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('García')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ana@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-06-01')).toBeInTheDocument();
  });

  it('disables save when reservation is not confirmed', async () => {
    installFetch([
      {
        match: (u) => u.includes('/reservations/res-1234abcd'),
        body: { ...RESERVATION, status: 'held' },
      },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Solo se pueden modificar reservas confirmadas.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('blocks save and shows email validation error', async () => {
    installFetch([
      { match: (u) => u.includes('/reservations/res-1234abcd'), body: RESERVATION },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ingresa un correo electrónico válido')).toBeInTheDocument();
  });

  it('submits a PATCH with the diff and surfaces a success alert', async () => {
    const calls = installFetch([
      {
        match: (u, i) => u.endsWith('/reservations/res-1234abcd') && (!i || i.method !== 'PATCH'),
        body: RESERVATION,
      },
      {
        match: (_u, i) => !!i && i.method === 'PATCH',
        body: { ...RESERVATION, checkIn: '2026-06-10' },
      },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('checkIn'), { target: { value: '2026-06-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(screen.getByText('Reserva actualizada con éxito.')).toBeInTheDocument();
    });

    const patchCall = calls.find((c) => c.init?.method === 'PATCH');
    expect(patchCall).toBeDefined();
    expect(JSON.parse((patchCall!.init!.body as string))).toEqual({ checkIn: '2026-06-02' });
  });

  it('opens the cancel dialog and shows the partial refund quote', async () => {
    installFetch([
      {
        match: (u) => u.includes('/reservations/res-1234abcd') && u.includes('refund-quote'),
        body: REFUND_QUOTE,
      },
      {
        match: (u) => u.endsWith('/reservations/res-1234abcd'),
        body: RESERVATION,
      },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));

    await waitFor(() => {
      expect(screen.getByText(/Reembolso parcial:/)).toBeInTheDocument();
    });
  });

  it('shows an error alert when the reservation cannot be loaded', async () => {
    installFetch([
      { match: () => true, body: { message: 'boom' }, ok: false },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar la reserva.')).toBeInTheDocument();
    });
  });

  it('shows the no-refund policy when refund quote returns no_refund', async () => {
    installFetch([
      {
        match: (u) => u.includes('refund-quote'),
        body: { policy: 'no_refund', refundableUsd: 0, daysUntilCheckIn: 1 },
      },
      { match: (u) => u.endsWith('/reservations/res-1234abcd'), body: RESERVATION },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    await waitFor(() => {
      expect(screen.getByText('Sin reembolso: faltan menos de 2 días para el check-in.')).toBeInTheDocument();
    });
  });

  it('shows the full-refund policy when refund quote returns full_refund', async () => {
    installFetch([
      {
        match: (u) => u.includes('refund-quote'),
        body: { policy: 'full_refund', refundableUsd: 600, daysUntilCheckIn: 12 },
      },
      { match: (u) => u.endsWith('/reservations/res-1234abcd'), body: RESERVATION },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    await waitFor(() => {
      expect(screen.getByText(/Cancelación gratuita:/)).toBeInTheDocument();
    });
  });

  it('navigates back to the property dashboard after a successful cancellation', async () => {
    installFetch([
      {
        match: (u) => u.includes('refund-quote'),
        body: { policy: 'partial_refund', refundableUsd: 300, daysUntilCheckIn: 4 },
      },
      {
        match: (u, i) => u.includes('/reservations/res-1234abcd/cancel') && i?.method === 'PATCH',
        body: {},
      },
      { match: (u) => u.endsWith('/reservations/res-1234abcd'), body: RESERVATION },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    await waitFor(() => {
      expect(screen.getByText(/Reembolso parcial:/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/mi-hotel/$propertyId',
        params: { propertyId: 'prop-abc' },
      });
    });
  });

  it('navigates back to the property dashboard when the back button is clicked', async () => {
    installFetch([
      { match: (u) => u.includes('/reservations/res-1234abcd'), body: RESERVATION },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Regresar' }));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/mi-hotel/$propertyId',
      params: { propertyId: 'prop-abc' },
    });
  });
});
