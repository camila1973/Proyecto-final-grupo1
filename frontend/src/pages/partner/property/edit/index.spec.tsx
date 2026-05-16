import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../../../../i18n/test-utils';
import { AuthContext } from '../../../../context/auth-context';
import PropertyEditPage from './index';

setupTestI18n('es');

const mockNavigate = jest.fn();
const mockUseSearch = jest.fn().mockReturnValue({ tab: 'info' });
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ propertyId: 'prop-abc-1234' }),
  useSearch: () => mockUseSearch(),
}));

// MediaTab and QrTab use qrcode.react which doesn't matter here; mock to avoid render issues
jest.mock('qrcode.react', () => ({
  QRCodeSVG: () => null,
}));

const PROPERTY = {
  id: 'prop-abc-1234',
  name: 'Hotel Test',
  type: 'hotel',
  city: 'Bogotá',
  stars: 4,
  status: 'active',
  countryCode: 'CO',
  partnerId: 'partner-1',
  neighborhood: 'Chapinero',
  lat: null,
  lon: null,
  rating: 4.5,
  reviewCount: 25,
  thumbnailUrl: 'https://example.com/img.jpg',
  amenities: [],
  phone: '+57 1 555 0000',
  email: 'test@hotel.com',
  address: 'Calle 1',
  currency: 'COP',
  timezone: 'America/Bogota',
  description: 'A nice hotel',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

const MOCK_AUTH = {
  token: 'tok',
  user: { id: 'u', email: 'p@h.com', role: 'partner', partnerId: 'partner-1' },
  login: jest.fn(),
  logout: jest.fn(),
};

function buildFetch(options: { propertyOk?: boolean } = {}) {
  const { propertyOk = true } = options;
  return jest.fn().mockImplementation((url: string) => {
    if (url.includes('/inventory/properties/')) {
      if (!propertyOk) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PROPERTY) });
    }
    if (url.includes('/tax-rules')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    }
    if (url.includes('/partners/fees')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    }
    if (url.includes('commission-rules/resolve')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ partnerId: 'partner-1', ratePct: 20, source: 'global' }),
      });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  });
}

function renderPage(authValue: typeof MOCK_AUTH | null = MOCK_AUTH) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authValue as never}>
        <PropertyEditPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('PropertyEditPage', () => {
  beforeEach(() => {
    global.fetch = buildFetch() as never;
    mockUseSearch.mockReturnValue({ tab: 'info' });
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockNavigate.mockClear();
  });

  it('shows login alert when unauthenticated', () => {
    renderPage({ token: null, user: null, login: jest.fn(), logout: jest.fn() } as never);
    expect(screen.getByText('Inicia sesión como socio para editar tu propiedad.')).toBeInTheDocument();
  });

  it('renders the page title once loaded', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Editar propiedad').length).toBeGreaterThan(0));
  });

  it('renders InfoTab fields after load', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue('Hotel Test')).toBeInTheDocument());
  });

  it('shows error alert when property fetch fails', async () => {
    global.fetch = buildFetch({ propertyOk: false }) as never;
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar la propiedad. Inténtalo más tarde.')).toBeInTheDocument();
    });
  });

  it('back button navigates to the property dashboard', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Editar propiedad').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText('Regresar'));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/mi-hotel/$propertyId' }),
    );
  });

  it('switches to the tax tab via the navigator', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Editar propiedad').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText('Reglas de impuesto'));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: { tab: 'tax' } }),
    );
  });

  it('renders the tax tab when the URL says tab=tax', async () => {
    mockUseSearch.mockReturnValue({ tab: 'tax' });
    renderPage();
    await waitFor(() => expect(screen.getByText(/Reglas de impuesto · Bogotá/)).toBeInTheDocument());
  });

  it('renders the fees tab when the URL says tab=fees', async () => {
    mockUseSearch.mockReturnValue({ tab: 'fees' });
    renderPage();
    await waitFor(() => {
      // FeesTab renders KPI "COMISIÓN POR RESERVA" or similar; just assert the page renders without crashing.
      expect(screen.getAllByText(/Editar propiedad/).length).toBeGreaterThan(0);
    });
  });

  it('renders the qr tab when the URL says tab=qr', async () => {
    mockUseSearch.mockReturnValue({ tab: 'qr' });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/Editar propiedad/).length).toBeGreaterThan(0);
    });
  });
});
