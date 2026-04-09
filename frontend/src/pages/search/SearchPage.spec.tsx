import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocaleProvider } from '../../context/LocaleContext';
import { setupTestI18n } from '../../i18n/test-utils';
import es from '../../i18n/locales/es.json';
import SearchPage from './index';

setupTestI18n('es');

// ─── Mock router hooks ────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockUseSearch = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
  useNavigate: () => mockNavigate,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockSearchResult = {
  roomId: 'r1',
  roomType: 'suite',
  bedType: 'king',
  viewType: 'city',
  capacity: 2,
  basePriceUsd: 320,
  priceUsd: 280,
  taxRatePct: 16,
  estimatedTotalUsd: 1300,
  hasFlatFees: false,
  property: {
    id: 'p1',
    name: 'Gran Caribe Resort',
    city: 'Cancún',
    countryCode: 'MX',
    neighborhood: 'Zona Hotelera',
    thumbnailUrl: 'https://placehold.co/400x300',
    amenities: ['wifi', 'pool'],
    stars: 5,
    rating: 4.7,
    reviewCount: 842,
  },
};

const mockSearchResponse = {
  meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
  results: [mockSearchResult],
  facets: {
    roomTypes: [{ id: 'suite', count: 1 }],
    amenities: [{ id: 'wifi', count: 1 }],
    priceRange: { min: 280, max: 280, currency: 'USD' },
  },
};

const emptySearchResponse = {
  meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
  results: [],
  facets: { roomTypes: [], amenities: [], priceRange: { min: 0, max: 0, currency: 'USD' } },
};

const taxonomyResponse = { categories: [] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns different responses based on URL — taxonomy vs search */
function makeFetchMock(searchResponse: unknown) {
  return (url: string) => {
    if (String(url).includes('/taxonomies')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(taxonomyResponse) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(searchResponse) });
  };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <LocaleProvider>
        <QueryClientProvider client={qc}>
          <SearchPage />
        </QueryClientProvider>
      </LocaleProvider>
    </LocalizationProvider>,
  );
  return qc;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SearchPage', () => {
  beforeEach(() => {
    mockUseSearch.mockReturnValue({
      city: 'Cancún',
      checkIn: '2026-04-01',
      checkOut: '2026-04-05',
      guests: 2,
    });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading message while fetching', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (String(url).includes('/taxonomies')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(taxonomyResponse) });
        }
        return new Promise(() => {}); // search never resolves
      });
      renderPage();
      expect(await screen.findByText(es.search.loading)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when the search request fails', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (String(url).includes('/taxonomies')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(taxonomyResponse) });
        }
        return Promise.resolve({ ok: false });
      });
      renderPage();
      expect(await screen.findByText(es.search.error)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no results are returned', async () => {
      (global.fetch as jest.Mock).mockImplementation(makeFetchMock(emptySearchResponse));
      renderPage();
      expect(await screen.findByText(es.search.empty)).toBeInTheDocument();
    });
  });

  describe('results state', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockImplementation(makeFetchMock(mockSearchResponse));
    });

    it('renders property name from results', async () => {
      renderPage();
      expect(await screen.findByText('Gran Caribe Resort')).toBeInTheDocument();
    });

    it('shows the city in the results count line', async () => {
      renderPage();
      await screen.findByText('Gran Caribe Resort');
      expect(screen.getByText(/encontrados en Cancún/)).toBeInTheDocument();
    });

    it('renders a book button for each result', async () => {
      renderPage();
      expect(await screen.findByText(es.search.card.book)).toBeInTheDocument();
    });

    it('navigates to property detail when book is clicked', async () => {
      renderPage();
      fireEvent.click(await screen.findByText(es.search.card.book));
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/properties/$propertyId',
        params: { propertyId: 'p1' },
        search: { checkIn: '2026-04-01', checkOut: '2026-04-05', guests: 2 },
      });
    });
  });

  describe('filter interactions', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockImplementation(makeFetchMock(mockSearchResponse));
    });

    it('does not show the clear button initially', async () => {
      renderPage();
      await screen.findByText('Gran Caribe Resort');
      expect(screen.queryByText(es.search.filters.clear)).not.toBeInTheDocument();
    });

    it('shows clear button after entering a price filter', async () => {
      renderPage();
      await screen.findByText('Gran Caribe Resort');
      const priceMinInput = screen.getByPlaceholderText('0');
      fireEvent.change(priceMinInput, { target: { value: '500000' } });
      await waitFor(() => {
        expect(screen.getByText(es.search.filters.clear)).toBeInTheDocument();
      });
    });

    it('hides clear button after clearing all filters', async () => {
      renderPage();
      await screen.findByText('Gran Caribe Resort');
      const priceMinInput = screen.getByPlaceholderText('0');
      fireEvent.change(priceMinInput, { target: { value: '500000' } });
      await waitFor(() => screen.getByText(es.search.filters.clear));
      fireEvent.click(screen.getByText(es.search.filters.clear));
      await waitFor(() => {
        expect(screen.queryByText(es.search.filters.clear)).not.toBeInTheDocument();
      });
    });

    it('toggles amenity checkbox on and off', async () => {
      renderPage();
      await screen.findByText('Gran Caribe Resort');
      const [checkbox] = screen.getAllByRole('checkbox');
      fireEvent.click(checkbox);
      await waitFor(() => expect(checkbox).toBeChecked());
      fireEvent.click(checkbox);
      await waitFor(() => expect(checkbox).not.toBeChecked());
    });
  });

  describe('URL params', () => {
    it('pre-fills city input from URL search params', async () => {
      (global.fetch as jest.Mock).mockImplementation(makeFetchMock(emptySearchResponse));
      mockUseSearch.mockReturnValue({ city: 'Barcelona', checkIn: '', checkOut: '', guests: 1 });
      renderPage();
      await screen.findByText(es.search.empty);
      expect(screen.getByDisplayValue('Barcelona')).toBeInTheDocument();
    });
  });
});
