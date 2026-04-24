import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupTestI18n } from '../i18n/test-utils';
import { LocaleProvider } from '../context/LocaleContext';
import HomePage from './HomePage';
import es from '../i18n/locales/es.json';

setupTestI18n('es');

const mockNavigate = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../components/SearchBarForm', () => () => <div>search-bar-form</div>);

jest.mock('../components/VerticalCard', () => ({
  __esModule: true,
  default: ({ imageAlt, onClick }: { imageAlt?: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      open-{imageAlt}
    </button>
  ),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <HomePage />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders hero and recommendations titles', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });

    renderPage();

    expect(screen.getByText(es.hero.title)).toBeInTheDocument();
    expect(screen.getByText(es.recommendations.title)).toBeInTheDocument();
    expect(screen.getByText('search-bar-form')).toBeInTheDocument();
  });

  it('fetches featured properties and renders cards', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              basePriceUsd: 125,
              property: {
                id: 'p_1',
                name: 'Gran Caribe Resort',
                city: 'Cancun',
                neighborhood: 'Zona Hotelera',
                countryCode: 'MX',
                thumbnailUrl: 'img',
              },
            },
          ],
        }),
    });

    renderPage();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/search/featured?limit=3'));
    });
    expect(await screen.findByRole('button', { name: 'open-Gran Caribe Resort' })).toBeInTheDocument();
  });

  it('navigates to property details when featured card is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              basePriceUsd: 90,
              property: {
                id: 'prop_123',
                name: 'Hotel Test',
                city: 'Bogota',
                neighborhood: 'Chapinero',
                countryCode: 'CO',
                thumbnailUrl: 'img',
              },
            },
          ],
        }),
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'open-Hotel Test' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/properties/$propertyId',
        params: { propertyId: 'prop_123' },
        search: expect.objectContaining({ guests: 2 }),
      }),
    );
  });
});
