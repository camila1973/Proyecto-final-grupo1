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
  lat: 4.65,
  lon: -74.05,
  stars: 4,
  rating: 4.5,
  reviewCount: 120,
  thumbnailUrl: 'https://example.com/hotel.jpg',
  amenities: ['wifi', 'pool'],
};

const mockRooms = [
  {
    id: 'r1',
    propertyId: 'prop_001',
    roomType: 'suite',
    bedType: 'king',
    viewType: 'city',
    capacity: 2,
    totalRooms: 5,
    basePriceUsd: '150.00',
    status: 'active',
  },
];

function mockFetch(propertyOk = true, rooms = mockRooms) {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('/rooms')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(rooms) });
    }
    if (!propertyOk) return Promise.resolve({ ok: false });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProperty) });
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

  it('shows property details after successful fetch', async () => {
    mockFetch();
    renderPage();
    expect(await screen.findByText('Hotel Test')).toBeInTheDocument();
    expect(screen.getByText('Chapinero, Bogotá, CO')).toBeInTheDocument();
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Piscina')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    mockFetch(false);
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
    expect(await screen.findByText('Reservar')).toBeInTheDocument();
  });
});
