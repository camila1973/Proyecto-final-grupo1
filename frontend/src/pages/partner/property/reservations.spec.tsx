import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../i18n/test-utils';
import { LocaleProvider } from '../../../context/LocaleContext';
import { AuthContext } from '../../../context/auth-context';
import PropertyReservationsPage from './reservations';

setupTestI18n('es');

const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ propertyId: 'prop-abc' }),
}));

jest.mock('recharts', () => {
  const React = jest.requireActual('react');
  const Stub = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);
  return {
    ResponsiveContainer: Stub,
    BarChart: Stub,
    LineChart: Stub,
    Bar: () => null,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONFIRMED_RESERVATION = {
  id: 'res-uuid-1234',
  status: 'confirmed',
  guestName: 'María López',
  guestEmail: 'maria@test.com',
  guestPhone: '+573001234567',
  guestCount: 2,
  checkIn: '2026-05-10',
  checkOut: '2026-05-13',
  roomType: 'Doble Superior',
  grandTotalUsd: 300,
};

const CHECKED_IN_RESERVATION = {
  ...CONFIRMED_RESERVATION,
  id: 'res-uuid-5678',
  status: 'checked_in',
  guestName: 'Carlos Ruiz',
};

const METRICS_RESPONSE = {
  partnerId: 'partner-1',
  propertyId: 'prop-abc',
  month: '2026-05',
  roomType: null,
  metrics: { confirmed: 5, cancelled: 2, revenueUsd: 2000, lossesUsd: 200, netUsd: 1800 },
  monthlySeries: [{ month: '2026-05', revenueUsd: 2000, lossesUsd: 200, occupancyRate: 0.7 }],
};

const PROPERTY_RESPONSE = {
  propertyId: 'prop-abc',
  propertyName: 'Hotel Test',
  propertyCity: 'Bogotá',
  propertyNeighborhood: null,
  propertyCountryCode: 'CO',
  propertyThumbnailUrl: null,
  roomCount: 0,
  reservationCount: 0,
};

const MOCK_AUTH = {
  token: 'test-token',
  user: { id: 'usr-1', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReservationsBody(reservations: typeof CONFIRMED_RESERVATION[]) {
  return {
    partnerId: 'partner-1',
    propertyId: 'prop-abc',
    month: '2026-05',
    roomType: null,
    reservations,
  };
}

function mockFetch(
  reservations: typeof CONFIRMED_RESERVATION[] = [CONFIRMED_RESERVATION],
  options: { ok?: boolean; checkInFails?: boolean } = {},
) {
  const { ok = true, checkInFails = false } = options;
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (!ok) {
      return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
    }

    // Mutation endpoints
    if ((url as string).includes('/partner-check-in')) {
      if (checkInFails) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ message: 'Reservation must be confirmed' }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }
    if ((url as string).includes('/check-out')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }
    if ((url as string).includes('/cancel') && (init?.method === 'PATCH')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }

    // Query endpoints
    if ((url as string).includes('/reservations')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(makeReservationsBody(reservations)) });
    }
    if ((url as string).match(/\/properties\/[^/]+\/rooms$/)) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ partnerId: 'partner-1', propertyId: 'prop-abc', rooms: [] }) });
    }
    if ((url as string).match(/\/properties\/[^/]+$/)) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PROPERTY_RESPONSE) });
    }
    // metrics
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(METRICS_RESPONSE) });
  }) as never;
}

function renderPage(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue as never}>
        <LocaleProvider>
          <PropertyReservationsPage />
        </LocaleProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PropertyReservationsPage', () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ── Auth & error states ────────────────────────────────────────────────────

  it('shows login required alert when unauthenticated', () => {
    renderPage({ token: null, user: null, login: jest.fn(), logout: jest.fn() } as never);
    expect(screen.getByText('Inicia sesión como socio para ver el panel.')).toBeInTheDocument();
  });

  it('renders the reservations table title', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    expect(screen.getByText('Reservaciones')).toBeInTheDocument();
  });

  // ── Reservation table rendering ────────────────────────────────────────────

  it('renders guest name and status chip for a confirmed reservation', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByText('maria@test.com')).toBeInTheDocument();
  });

  it('shows empty-month message when no reservations exist', async () => {
    mockFetch([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No hay reservaciones para este mes.')).toBeInTheDocument();
    });
  });

  // ── Search & filter ────────────────────────────────────────────────────────

  it('filters reservations by reservation id (partial match)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.change(
      screen.getByPlaceholderText('Buscar por # reserva o huésped'),
      { target: { value: 'no-match-xyz' } },
    );
    expect(screen.queryByText('María López')).not.toBeInTheDocument();
    expect(screen.getByText('No hay reservaciones que coincidan con los filtros.')).toBeInTheDocument();
  });

  it('filters reservations by guest name (case-insensitive)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.change(
      screen.getByPlaceholderText('Buscar por # reserva o huésped'),
      { target: { value: 'maría' } },
    );
    expect(screen.getByText('María López')).toBeInTheDocument();
  });

  it('shows no-filter-results message when name search yields nothing', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.change(
      screen.getByPlaceholderText('Buscar por # reserva o huésped'),
      { target: { value: 'ghost' } },
    );
    expect(screen.getByText('No hay reservaciones que coincidan con los filtros.')).toBeInTheDocument();
  });

  // ── Status-based action buttons (kebab menu) ───────────────────────────────
  //
  // The inline check-in/check-out IconButtons were consolidated into a single
  // MoreVert (kebab) menu that always renders for non-terminal rows. The 5
  // actions inside (Edit, Check-in, No-show, Check-out, Cancel) are enabled or
  // disabled based on the row's status. We assert on the menu items' enabled
  // state rather than presence/absence.

  it('renders the kebab (more actions) button for non-terminal rows', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    expect(screen.getByLabelText('Más acciones')).toBeInTheDocument();
  });

  it('still renders the kebab for terminal statuses (items inside are disabled)', async () => {
    mockFetch([{ ...CONFIRMED_RESERVATION, status: 'cancelled' }]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cancelada')).toBeInTheDocument());
    expect(screen.getByLabelText('Más acciones')).toBeInTheDocument();
  });

  it('enables Check-in in the menu for confirmed reservations', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    const checkInItem = await screen.findByText('Registrar Check-in');
    expect(checkInItem.closest('li')).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('disables Check-in in the menu for non-confirmed reservations', async () => {
    mockFetch([{ ...CONFIRMED_RESERVATION, status: 'checked_out' }]);
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    const checkInItem = await screen.findByText('Registrar Check-in');
    expect(checkInItem.closest('li')).toHaveAttribute('aria-disabled', 'true');
  });

  it('enables Check-out in the menu for checked_in reservations', async () => {
    mockFetch([CHECKED_IN_RESERVATION]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    const checkOutItem = await screen.findByText('Registrar Check-out');
    expect(checkOutItem.closest('li')).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('disables all destructive menu items for terminal statuses', async () => {
    mockFetch([{ ...CONFIRMED_RESERVATION, status: 'cancelled' }]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cancelada')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    const checkIn = await screen.findByText('Registrar Check-in');
    const checkOut = await screen.findByText('Registrar Check-out');
    const cancel = await screen.findByText('Cancelar reserva');
    expect(checkIn.closest('li')).toHaveAttribute('aria-disabled', 'true');
    expect(checkOut.closest('li')).toHaveAttribute('aria-disabled', 'true');
    expect(cancel.closest('li')).toHaveAttribute('aria-disabled', 'true');
  });

  // ── Check-in flow ──────────────────────────────────────────────────────────

  it('opens confirmation dialog when Check-in menu item is clicked', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    fireEvent.click(await screen.findByText('Registrar Check-in'));
    await waitFor(() => {
      expect(screen.getByText('Confirmar Check-in')).toBeInTheDocument();
    });
    expect(screen.getByText('¿Confirmas que el huésped ha llegado y deseas registrar el check-in?')).toBeInTheDocument();
  });

  it('calls partner-check-in API and shows success snackbar on confirm', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    fireEvent.click(await screen.findByText('Registrar Check-in'));
    await waitFor(() => expect(screen.getByText('Confirmar Check-in')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Registrar Check-in', { selector: 'button' }));
    await waitFor(() => {
      expect(screen.getByText('Check-in registrado correctamente.')).toBeInTheDocument();
    });
    const patchCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([url, init]: [string, RequestInit]) => url.includes('/partner-check-in') && init?.method === 'PATCH',
    );
    expect(patchCalls.length).toBe(1);
  });

  it('shows error snackbar when check-in API returns an error', async () => {
    mockFetch([CONFIRMED_RESERVATION], { checkInFails: true });
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    fireEvent.click(await screen.findByText('Registrar Check-in'));
    await waitFor(() => expect(screen.getByText('Confirmar Check-in')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Registrar Check-in', { selector: 'button' }));
    await waitFor(() => {
      expect(screen.getByText('Reservation must be confirmed')).toBeInTheDocument();
    });
  });

  it('dismisses dialog without calling API when back button is clicked', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    fireEvent.click(await screen.findByText('Registrar Check-in'));
    await waitFor(() => expect(screen.getByText('Confirmar Check-in')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Regresar'));
    expect(screen.queryByText('Confirmar Check-in')).not.toBeInTheDocument();
    const patchCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([url, init]: [string, RequestInit]) => url.includes('/partner-check-in') && init?.method === 'PATCH',
    );
    expect(patchCalls.length).toBe(0);
  });

  // ── Context menu (MoreVert) ────────────────────────────────────────────────

  it('shows edit option in context menu for confirmed reservations', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    await waitFor(() => expect(screen.getByText('Editar reserva')).toBeInTheDocument());
  });

  it('navigates to edit page when edit option is selected from context menu', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    await waitFor(() => expect(screen.getByText('Editar reserva')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editar reserva'));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/mi-hotel/$propertyId/reservas/$reservationId/editar',
      params: { propertyId: 'prop-abc', reservationId: 'res-uuid-1234' },
    });
  });

  it('shows cancel option in context menu for confirmed reservations', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    await waitFor(() => expect(screen.getByText('Cancelar reserva')).toBeInTheDocument());
  });

  it('opens cancel confirmation dialog from context menu', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    await waitFor(() => expect(screen.getByText('Cancelar reserva')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancelar reserva'));
    await waitFor(() => {
      expect(screen.getByText('Cancelar reserva', { selector: '[role="heading"], h2' })).toBeInTheDocument();
    });
  });

  // ── Check-out flow ─────────────────────────────────────────────────────────

  it('confirms check-out and shows success snackbar', async () => {
    mockFetch([CHECKED_IN_RESERVATION]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    fireEvent.click(await screen.findByText('Registrar Check-out'));
    await waitFor(() => expect(screen.getByText('Confirmar Check-out')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Registrar Check-out', { selector: 'button' }));
    await waitFor(() => {
      expect(screen.getByText('Check-out registrado correctamente.')).toBeInTheDocument();
    });
    const patchCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([url, init]: [string, RequestInit]) => url.includes('/check-out') && init?.method === 'PATCH',
    );
    expect(patchCalls.length).toBe(1);
  });

  // ── Cancel flow ────────────────────────────────────────────────────────────

  it('confirms cancel and shows success snackbar', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    await waitFor(() => expect(screen.getByText('Cancelar reserva')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancelar reserva'));
    await waitFor(() => expect(screen.getByText('Esta acción cancelará la reserva y notificará al huésped. ¿Deseas continuar?')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancelar reserva', { selector: 'button' }));
    await waitFor(() => {
      expect(screen.getByText('Reserva cancelada.')).toBeInTheDocument();
    });
  });

  // ── StatusChip variants ────────────────────────────────────────────────────

  it('renders "En hotel" chip for checked_in status', async () => {
    mockFetch([CHECKED_IN_RESERVATION]);
    renderPage();
    await waitFor(() => expect(screen.getByText('En hotel')).toBeInTheDocument());
  });

  it('renders "Check-out" chip for checked_out status', async () => {
    mockFetch([{ ...CONFIRMED_RESERVATION, status: 'checked_out' }]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Check-out')).toBeInTheDocument());
  });

  it('renders "Cancelada" chip for cancelled status', async () => {
    mockFetch([{ ...CONFIRMED_RESERVATION, status: 'cancelled' }]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cancelada')).toBeInTheDocument());
  });

  // ── Context menu for checked_in ────────────────────────────────────────────

  it('shows check-out and cancel options in context menu for checked_in', async () => {
    mockFetch([CHECKED_IN_RESERVATION]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    await waitFor(() => expect(screen.getByText('Registrar Check-out')).toBeInTheDocument());
    expect(screen.getByText('Cancelar reserva')).toBeInTheDocument();
  });

  // ── Pagination control ─────────────────────────────────────────────────────

  it('renders the pagination control when reservations are present', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    // MUI Pagination renders a nav element with a default "pagination navigation" label.
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  // ── Status filter dropdown ─────────────────────────────────────────────────

  it('filters by status dropdown hiding non-matching rows', async () => {
    mockFetch([CONFIRMED_RESERVATION, CHECKED_IN_RESERVATION]);
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
    // Open the "Estado" select and pick the checked_in option
    fireEvent.mouseDown(screen.getByLabelText('Estado'));
    // findByRole scopes to the open listbox, avoiding ambiguity with the StatusChip
    const option = await screen.findByRole('option', { name: 'En hotel' });
    fireEvent.click(option);
    await waitFor(() => expect(screen.queryByText('María López')).not.toBeInTheDocument());
    expect(screen.getByText('Carlos Ruiz')).toBeInTheDocument();
  });

  // ── No-show flow ───────────────────────────────────────────────────────────

  it('enables No-show menu item when check_in is in the past', async () => {
    // Use a checkIn that is definitely in the past (2020).
    mockFetch([{ ...CONFIRMED_RESERVATION, checkIn: '2020-01-01' }]);
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    const noShow = await screen.findByText('Marcar no-show');
    expect(noShow.closest('li')).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('disables No-show when check_in is in the future', async () => {
    mockFetch([{ ...CONFIRMED_RESERVATION, checkIn: '2099-01-01' }]);
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Más acciones'));
    const noShow = await screen.findByText('Marcar no-show');
    expect(noShow.closest('li')).toHaveAttribute('aria-disabled', 'true');
  });

  it('search input shows empty-filter message when no rows match', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('María López')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Buscar por # reserva o huésped'), { target: { value: 'zzzz' } });
    expect(screen.getByText('No hay reservaciones que coincidan con los filtros.')).toBeInTheDocument();
  });

  it('renders error alert if the API fails', async () => {
    mockFetch([], { ok: false });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No se pudieron cargar las métricas. Inténtalo más tarde.')).toBeInTheDocument();
    });
  });
});
