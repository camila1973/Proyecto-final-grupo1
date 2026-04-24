import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { createMemoryHistory, createRouter, createRootRoute, createRoute, RouterProvider } from '@tanstack/react-router';
import { LocaleProvider } from '../context/LocaleContext';
import { setupTestI18n } from '../i18n/test-utils';
import PropertyDetailPage from './PropertyDetailPage';
import es from '../i18n/locales/es.json';

setupTestI18n('es');

const mockProperty = {
  id: 'prop_001',
  name: 'Hotel Test',
  city: 'Bogotá',
  countryCode: 'CO',
  neighborhood: 'Chapinero',
  stars: 4,
  rating: 4.5,
  reviewCount: 120,
  thumbnailUrl: 'https://example.com/hotel.jpg',
  imageUrls: [
    'https://example.com/hotel-1.jpg',
    'https://example.com/hotel-2.jpg',
    'https://example.com/hotel-3.jpg',
  ],
  description: 'Un hotel maravilloso en el corazón de Bogotá con vistas espectaculares, gastronomía de autor, spa de servicio completo y atención personalizada las 24 horas. Perfecto para viajes de negocios y ocio, rodeado de museos, restaurantes y cafés de primera línea. Habitaciones amplias y silenciosas, con amenidades de lujo y conectividad WiFi ultra rápida.',
  descriptionByLang: {
    es: 'Un hotel maravilloso en el corazón de Bogotá con vistas espectaculares, gastronomía de autor, spa de servicio completo y atención personalizada las 24 horas. Perfecto para viajes de negocios y ocio.',
    en: 'A wonderful hotel in the heart of Bogotá.',
  },
  amenities: ['wifi', 'pool'],
};

const mockRooms = [
  {
    roomId: 'r1',
    roomType: 'suite',
    bedType: 'king',
    viewType: 'city',
    capacity: 2,
    basePriceUsd: 150,
    priceUsd: 130,
    taxRatePct: 16,
    estimatedTotalUsd: 1205.6,
    hasFlatFees: false,
  },
];

function mockFetch(ok = true, rooms = mockRooms, property = mockProperty) {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    // reviews endpoint — return a quiet empty aggregate by default
    if (url.includes('/reviews')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            meta: { page: 1, pageSize: 5, total: 0, totalPages: 0, averageRating: 0 },
            reviews: [],
          }),
      });
    }
    return Promise.resolve({
      ok,
      json: () => Promise.resolve({ property: ok ? property : null, rooms: ok ? rooms : [] }),
    });
  });
}

function makeRouter(propertyId = 'prop_001') {
  const rootRoute = createRootRoute({ component: () => <LocaleProvider><PropertyDetailPage /></LocaleProvider> });
  const detailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/properties/$propertyId' });
  const routeTree = rootRoute.addChildren([detailRoute]);
  const history = createMemoryHistory({ initialEntries: [`/properties/${propertyId}`] });
  return createRouter({ routeTree, history });
}

function renderPage(propertyId = 'prop_001') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = makeRouter(propertyId);
  return render(
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </LocalizationProvider>,
  );
}

describe('PropertyDetailPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows loading state initially', async () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(await screen.findByText(es.property_detail.loading)).toBeInTheDocument();
  });

  it('calls the search rooms endpoint with propertyId', async () => {
    mockFetch();
    renderPage('prop_001');
    await screen.findByText('Hotel Test');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/search/properties/prop_001/rooms'),
    );
  });

  it('includes lang in the rooms query string', async () => {
    mockFetch();
    renderPage();
    await screen.findByText('Hotel Test');
    const urls = (global.fetch as jest.Mock).mock.calls.map((c) => c[0] as string);
    expect(urls.some((u) => u.includes('/rooms') && u.includes('lang=es'))).toBe(true);
  });

  it('fires a separate fetch for reviews', async () => {
    mockFetch();
    renderPage();
    await screen.findByText('Hotel Test');
    const urls = (global.fetch as jest.Mock).mock.calls.map((c) => c[0] as string);
    expect(urls.some((u) => u.includes('/properties/prop_001/reviews'))).toBe(true);
  });

  it('shows property details after successful fetch', async () => {
    mockFetch();
    renderPage();
    expect(await screen.findByText('Hotel Test')).toBeInTheDocument();
    expect(screen.getByText('Chapinero, Bogotá, CO')).toBeInTheDocument();
    expect(screen.getByText(es.taxonomies.amenities.wifi)).toBeInTheDocument();
    expect(screen.getByText(es.taxonomies.amenities.pool)).toBeInTheDocument();
  });

  it('renders the About section title and description', async () => {
    mockFetch();
    renderPage();
    expect(await screen.findByText(es.property_detail.about)).toBeInTheDocument();
    expect(screen.getByText(es.property_detail.read_more)).toBeInTheDocument();
  });

  it('renders the image carousel with at least the first image', async () => {
    mockFetch();
    const { container } = renderPage();
    await screen.findByText('Hotel Test');
    const imgs = container.querySelectorAll('img[src="https://example.com/hotel-1.jpg"]');
    expect(imgs.length).toBeGreaterThan(0);
  });

  it('shows error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    renderPage();
    expect(await screen.findByText(es.property_detail.error)).toBeInTheDocument();
  });

  it('shows error state when property is null', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ property: null, rooms: [] }),
    });
    renderPage();
    expect(await screen.findByText(es.property_detail.error)).toBeInTheDocument();
  });

  it('renders the back button', async () => {
    mockFetch();
    renderPage();
    expect(await screen.findByText(es.property_detail.back)).toBeInTheDocument();
  });

  it('renders room card with book button', async () => {
    mockFetch();
    renderPage();
    expect((await screen.findAllByText(es.property_detail.book_now)).length).toBeGreaterThan(0);
  });

  it('renders room type label', async () => {
    mockFetch();
    renderPage();
    expect(await screen.findByText('Suite')).toBeInTheDocument();
  });

  it('shows estimatedTotalUsd total with taxes included label', async () => {
    mockFetch();
    renderPage();
    expect(await screen.findByText(/impuestos incl\./)).toBeInTheDocument();
  });

  it('shows empty-reviews message when total=0', async () => {
    mockFetch();
    renderPage();
    expect(await screen.findByText(es.property_detail.reviews_empty)).toBeInTheDocument();
  });

  it('shows the reviews section title', async () => {
    mockFetch();
    renderPage();
    expect(await screen.findByText(es.property_detail.reviews)).toBeInTheDocument();
  });
});